import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StockfishEngine } from '@/engine/stockfishEngine'
import { getLevel } from '@/engine/levels'

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

  it('calibrates strength with UCI_LimitStrength and the level UCI_Elo, nothing else', async () => {
    // Stockfish 18 plays at full strength until UCI_LimitStrength is on, and
    // rejects a UCI_Elo it never got a limit flag for. It must send the flag
    // and the level's own number — and must not send `Skill Level`, which
    // Stockfish ignores while UCI_LimitStrength is on (engine/levels.ts).
    const engine = new StockfishEngine('/x/stockfish.js')
    const level = getLevel(3)
    await engine.configureLevel(level)

    const options = workers[0]?.posted.filter((c) => c.startsWith('setoption')) ?? []
    expect(options).toEqual([
      'setoption name UCI_LimitStrength value true',
      `setoption name UCI_Elo value ${level.uciElo}`,
    ])
  })

  it('re-sends the calibration to a worker booted to replace a wedged one', async () => {
    // A recycled worker is a blank Stockfish. Nothing upstream re-runs
    // configureLevel, so without this the battle plays the rest of the game
    // against a full-strength engine after a single timeout.
    behaviour = 'no-bestmove'
    const engine = new StockfishEngine('/x/stockfish.js', { analysisTimeoutMs: 30 })
    const level = getLevel(2)
    await engine.configureLevel(level)
    await expect(engine.analyze('fen', 6)).rejects.toThrow(/timed out/)
    expect(workers[0]?.terminated).toBe(true)

    behaviour = 'ready'
    await engine.analyze('fen', 6)

    const replacement = workers[1]?.posted.filter((c) => c.startsWith('setoption')) ?? []
    expect(replacement).toEqual([
      'setoption name UCI_LimitStrength value true',
      `setoption name UCI_Elo value ${level.uciElo}`,
    ])
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

  it('a timeout left over from a disposed worker does not tear down its replacement', async () => {
    behaviour = 'no-bestmove'
    const engine = new StockfishEngine('/x/stockfish.js', {
      analysisTimeoutMs: 50,
      initTimeoutMs: 50,
    })

    const first = engine.analyze('fen', 12)
    const firstRejects = expect(first).rejects.toThrow(/timed out/)
    // Let the worker boot and the search start before pulling it out.
    await new Promise((resolve) => setTimeout(resolve, 10))

    engine.dispose()
    expect(workers[0]?.terminated).toBe(true)

    // A fresh analyse gets a new worker while the first timeout is still armed.
    behaviour = 'ready'
    const analysis = await engine.analyze('fen', 12)
    expect(analysis.bestMove).toBe('e2e4')
    expect(workers).toHaveLength(2)

    // Let the stale timeout fire: it must leave the replacement alone.
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(workers[1]?.terminated).toBe(false)

    await firstRejects
  })
})
