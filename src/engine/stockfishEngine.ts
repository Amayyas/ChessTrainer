import type { EngineLevel } from '@/engine/levels'
import { parseBestMove, parseInfo } from '@/engine/uci'

export interface Analysis {
  /** Best move in UCI notation (e.g. 'e2e4'), or null when there is none. */
  bestMove: string | null
  /** Centipawns from the side-to-move's perspective, or null on a forced mate. */
  scoreCp: number | null
  /** Mate distance (signed) from the side-to-move's perspective, or null. */
  scoreMate: number | null
  /** Depth actually reached. */
  depth: number
  /** Principal variation, UCI moves. */
  pv: string[]
}

/** Same-origin path to the worker script; the CSP's worker-src is checked against it. */
export const DEFAULT_SCRIPT_URL = '/stockfish/stockfish.js'

/**
 * How long a single search may run before the worker is presumed wedged.
 * Single-threaded Stockfish 11 finishes the depths this app asks for (the
 * coach's 14, the battle's depth caps) in seconds, so this sits well clear of
 * a legitimate search while still bounding a stalled one.
 */
const DEFAULT_ANALYSIS_TIMEOUT_MS = 20_000
/** How long the engine has to report readiness after it is booted. */
const DEFAULT_INIT_TIMEOUT_MS = 10_000

/**
 * Rejects if `promise` has not settled within `ms`. On timeout `onExpiry` runs
 * first — the engine uses it to discard the wedged worker — then the returned
 * promise rejects. A promise that settles in time clears the timer, so a late
 * expiry can never fire against a healthy engine.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onExpiry: () => void,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onExpiry()
      reject(new Error(message))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/**
 * Thin wrapper around the Stockfish Web Worker. Communicates
 * over UCI, runs one search at a time (analyses are serialised so their output
 * never interleaves), and keeps the worker alive for reuse.
 *
 * Both boot and search are time-bounded: a worker that starts but never reports
 * readiness, or a search that never returns a `bestmove`, would otherwise leave
 * the queue pending for good — which the coach cannot tell apart from an
 * analysis still running. On a timeout the worker is discarded and the call
 * rejects, and the next call boots a fresh one.
 */
export class StockfishEngine {
  private worker: Worker | null = null
  private listeners = new Set<(line: string) => void>()
  private readyPromise: Promise<void> | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private readonly initTimeoutMs: number
  private readonly analysisTimeoutMs: number

  constructor(
    private readonly scriptUrl: string = DEFAULT_SCRIPT_URL,
    options: { initTimeoutMs?: number; analysisTimeoutMs?: number } = {},
  ) {
    this.initTimeoutMs = options.initTimeoutMs ?? DEFAULT_INIT_TIMEOUT_MS
    this.analysisTimeoutMs = options.analysisTimeoutMs ?? DEFAULT_ANALYSIS_TIMEOUT_MS
  }

  /** Discards the worker and any pending readiness, so the next call boots afresh. */
  private recycleWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.listeners.clear()
    this.readyPromise = null
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(this.scriptUrl)
      this.worker.onmessage = (event: MessageEvent) => {
        const line = typeof event.data === 'string' ? event.data : String(event.data)
        for (const listener of this.listeners) listener(line)
      }
    }
    return this.worker
  }

  private send(command: string): void {
    this.ensureWorker().postMessage(command)
  }

  /**
   * Applies a UCI option. Used to calibrate playing strength;
   * see engine/levels.ts for why Skill Level replaces UCI_Elo here.
   */
  async setOption(name: string, value: string | number): Promise<void> {
    await this.init()
    this.send(`setoption name ${name} value ${value}`)
  }

  /** Calibrates playing strength to a difficulty level. */
  async configureLevel(level: EngineLevel): Promise<void> {
    await this.setOption('Skill Level', level.skill)
    await this.setOption('Skill Level Maximum Error', level.maxError)
    await this.setOption('Skill Level Probability', level.errorProbability)
  }

  /** Boots the engine and resolves once it reports readiness (uciok + readyok). */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise
    this.ensureWorker()

    const ready = new Promise<void>((resolve) => {
      const onLine = (line: string) => {
        if (line.startsWith('uciok')) {
          this.send('isready')
        } else if (line.startsWith('readyok')) {
          this.listeners.delete(onLine)
          resolve()
        }
      }
      this.listeners.add(onLine)
      this.send('uci')
    })

    // A worker that boots but never reports readiness would hang every
    // analyze() at `await this.init()`. Discard it on timeout so a retry — the
    // coach makes several — gets a fresh one instead of the same dead worker.
    this.readyPromise = withTimeout(
      ready,
      this.initTimeoutMs,
      () => this.recycleWorker(),
      `Stockfish did not report readiness within ${this.initTimeoutMs}ms`,
    )
    return this.readyPromise
  }

  /**
   * Analyses a position to the given depth and resolves with the final evaluation
   * once Stockfish reports its best move. Calls are serialised.
   */
  analyze(fen: string, depth: number): Promise<Analysis> {
    const run = async (): Promise<Analysis> => {
      await this.init()
      const search = new Promise<Analysis>((resolve) => {
        let scoreCp: number | null = null
        let scoreMate: number | null = null
        let pv: string[] = []
        let reachedDepth = 0

        const onLine = (line: string) => {
          const info = parseInfo(line)
          if (info) {
            reachedDepth = info.depth
            if (info.scoreCp !== null) {
              scoreCp = info.scoreCp
              scoreMate = null
            }
            if (info.scoreMate !== null) {
              scoreMate = info.scoreMate
              scoreCp = null
            }
            if (info.pv.length > 0) pv = info.pv
            return
          }

          const best = parseBestMove(line)
          if (best !== null) {
            this.listeners.delete(onLine)
            resolve({
              bestMove: best === '(none)' ? null : best,
              scoreCp,
              scoreMate,
              depth: reachedDepth,
              pv,
            })
          }
        }

        this.listeners.add(onLine)
        this.send(`position fen ${fen}`)
        this.send(`go depth ${depth}`)
      })

      // A search that never reports `bestmove` — a crashed worker, a wedged
      // engine — would leave this promise, and the whole queue behind it,
      // pending for good, which the coach cannot tell from an analysis still
      // running. On timeout the worker is discarded and the rejection reaches
      // useStockfish as a null result, which the coach already treats as a
      // refusal and retries.
      return withTimeout(
        search,
        this.analysisTimeoutMs,
        () => this.recycleWorker(),
        `Stockfish analysis timed out after ${this.analysisTimeoutMs}ms`,
      )
    }

    // Chain onto the queue so only one search is ever in flight.
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => undefined)
    return result
  }

  /** Frees the worker. A later analyze() will transparently boot a new one. */
  dispose(): void {
    // A clean shutdown, unlike recycleWorker's: say goodbye to a live worker
    // and clear the queue too, since nothing is expected to run after this.
    if (this.worker) this.send('quit')
    this.recycleWorker()
    this.queue = Promise.resolve()
  }
}
