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

const DEFAULT_SCRIPT_URL = '/stockfish/stockfish.js'

/**
 * Thin wrapper around the Stockfish Web Worker. Communicates
 * over UCI, runs one search at a time (analyses are serialised so their output
 * never interleaves), and keeps the worker alive for reuse.
 */
export class StockfishEngine {
  private worker: Worker | null = null
  private listeners = new Set<(line: string) => void>()
  private readyPromise: Promise<void> | null = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly scriptUrl: string = DEFAULT_SCRIPT_URL) {}

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

    this.readyPromise = new Promise<void>((resolve) => {
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
    return this.readyPromise
  }

  /**
   * Analyses a position to the given depth and resolves with the final evaluation
   * once Stockfish reports its best move. Calls are serialised.
   */
  analyze(fen: string, depth: number): Promise<Analysis> {
    const run = async (): Promise<Analysis> => {
      await this.init()
      return new Promise<Analysis>((resolve) => {
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
    }

    // Chain onto the queue so only one search is ever in flight.
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => undefined)
    return result
  }

  /** Frees the worker. A later analyze() will transparently boot a new one. */
  dispose(): void {
    if (this.worker) {
      this.send('quit')
      this.worker.terminate()
      this.worker = null
    }
    this.listeners.clear()
    this.readyPromise = null
    this.queue = Promise.resolve()
  }
}
