import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StockfishEngine } from '@/engine/stockfishEngine'

/**
 * The engine's failure modes, not its happy path (uci.ts covers the parsing).
 *
 * A worker that boots but never answers, or a search that never returns a
 * `bestmove`, used to leave the promise — and every analyse queued behind it —
 * pending for good. Nothing surfaced it: a stalled coach looks exactly like a
 * coach still working. These assert the timeouts that bound both, and that the
 * engine comes back on the next call rather than staying dead.
 */

/** What the fake worker does with the commands it is sent. */
type Behaviour = 'ready' | 'silent' | 'no-bestmove'
let behaviour: Behaviour = 'ready'
let workers: FakeWorker[] = []

/**
 * Stands in for the Stockfish Web Worker. jsdom has no Worker at all, so the
 * engine would otherwise be untestable here.
 */
class FakeWorker {
  onmessage: ((event: { data: string }) => void) | null = null
  readonly posted: string[] = []
  terminated = false

  constructor(readonly url: string) {
    workers.push(this)
  }

  postMessage(command: string): void {
    this.posted.push(command)
    if (behaviour === 'silent') return
    if (command === 'uci') this.reply('uciok')
    else if (command === 'isready') this.reply('readyok')
    else if (command.startsWith('go')) {
      if (behaviour === 'no-bestmove') return
      this.reply('info depth 12 score cp 30 pv e2e4 e7e5')
      this.reply('bestmove e2e4')
    }
  }

  terminate(): void {
    this.terminated = true
  }

  /** Engine output arrives asynchronously, as it would from a real worker. */
  private reply(line: string): void {
    queueMicrotask(() => this.onmessage?.({ data: line }))
  }
}

beforeEach(() => {
  behaviour = 'ready'
  workers = []
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StockfishEngine', () => {
  it('resolves with the evaluation when the worker answers', async () => {
    const engine = new StockfishEngine('/x/stockfish.js')
    const analysis = await engine.analyze('fen', 12)
    expect(analysis).toMatchObject({ bestMove: 'e2e4', scoreCp: 30, depth: 12 })
  })

  it('rejects init() when the worker never reports readiness', async () => {
    behaviour = 'silent'
    const engine = new StockfishEngine('/x/stockfish.js', { initTimeoutMs: 30 })
    await expect(engine.init()).rejects.toThrow(/readiness within 30ms/)
  })

  it('rejects analyze() when the search never returns a best move', async () => {
    behaviour = 'no-bestmove'
    const engine = new StockfishEngine('/x/stockfish.js', { analysisTimeoutMs: 30 })
    await expect(engine.analyze('fen', 12)).rejects.toThrow(/timed out after 30ms/)
  })

  it('discards the wedged worker and boots a fresh one on the next call', async () => {
    behaviour = 'no-bestmove'
    const engine = new StockfishEngine('/x/stockfish.js', { analysisTimeoutMs: 30 })

    await expect(engine.analyze('fen', 12)).rejects.toThrow(/timed out/)
    expect(workers).toHaveLength(1)
    expect(workers[0]?.terminated).toBe(true)

    // The engine has recovered: the next analyse gets a new worker, not the
    // dead one, and completes.
    behaviour = 'ready'
    const analysis = await engine.analyze('fen', 12)
    expect(analysis.bestMove).toBe('e2e4')
    expect(workers).toHaveLength(2)
    expect(workers[1]?.terminated).toBe(false)
  })

  it('does not fire a timeout against a healthy, slow-started engine', async () => {
    // The timer must be cleared when the search resolves in time, or a late
    // expiry would tear down a worker that is doing nothing wrong.
    const engine = new StockfishEngine('/x/stockfish.js', { analysisTimeoutMs: 40 })
    await engine.analyze('fen', 12)
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(workers).toHaveLength(1)
    expect(workers[0]?.terminated).toBe(false)
  })
})
