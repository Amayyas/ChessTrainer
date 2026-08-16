/**
 * Minimal parser for the Stockfish UCI output lines we rely on.
 * Everything here is pure so it can be unit-tested without a running engine.
 */

export interface UciInfo {
  depth: number
  /** Centipawn score from the side-to-move's perspective, or null on a mate line. */
  scoreCp: number | null
  /** Mate distance in moves (signed) from the side-to-move's perspective, else null. */
  scoreMate: number | null
  /** Principal variation as UCI moves, e.g. ['e2e4', 'e7e5']. */
  pv: string[]
}

/**
 * Parses an `info ... depth N ... score cp|mate X ... pv ...` line.
 * Returns null for info lines without a depth+score (e.g. `info string ...`).
 */
export function parseInfo(line: string): UciInfo | null {
  if (!line.startsWith('info ')) return null

  const tokens = line.split(/\s+/)
  const depthIndex = tokens.indexOf('depth')
  const scoreIndex = tokens.indexOf('score')
  if (depthIndex === -1 || scoreIndex === -1) return null

  const depth = Number(tokens[depthIndex + 1])
  if (!Number.isFinite(depth)) return null

  const scoreType = tokens[scoreIndex + 1]
  const scoreValue = Number(tokens[scoreIndex + 2])
  if (!Number.isFinite(scoreValue)) return null

  const pvIndex = tokens.indexOf('pv')
  const pv = pvIndex === -1 ? [] : tokens.slice(pvIndex + 1)

  return {
    depth,
    scoreCp: scoreType === 'cp' ? scoreValue : null,
    scoreMate: scoreType === 'mate' ? scoreValue : null,
    pv,
  }
}

/**
 * Parses a `bestmove e2e4 [ponder ...]` line.
 * Returns the UCI move, the string `(none)` when there is no legal move, or null
 * if the line is not a bestmove line.
 */
export function parseBestMove(line: string): string | null {
  if (!line.startsWith('bestmove')) return null
  const move = line.split(/\s+/)[1]
  return move ?? null
}

/** Splits a UCI move like `e7e8q` into its squares and optional promotion piece. */
export function parseUciMove(uci: string): {
  from: string
  to: string
  promotion?: string
} | null {
  if (uci.length < 4) return null
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  }
}
