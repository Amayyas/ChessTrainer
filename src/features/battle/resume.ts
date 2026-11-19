import { Chess } from 'chess.js'
import { ENGINE_LEVELS, type LevelId } from '@/engine/levels'
import type { Color } from '@/utils/chess'

/**
 * A game taken up from the coach, just before a move it graded a mistake: the
 * position, the side that went wrong — who is to move there, and who the
 * player takes again — and the move to do better than.
 */
export interface Resume {
  /** The position before the mistake, with the side that made it to move. */
  fen: string
  color: Color
  /** The mistake, in English SAN as chess.js writes it. */
  san: string
  /** The level the game was played at, when it came from the battle mode. */
  levelId?: LevelId
}

/**
 * The resume carried in router state, or null when there is none or it does
 * not hold together.
 *
 * Router state lives in the browser's history, so it outlasts a deploy and can
 * be anything by the time it is read back. A position that does not load, a
 * mistake that is not a legal move there, or a side that is not the one to
 * move is turned away rather than started: the player would be handed a game
 * that is not the one they asked to take up.
 */
export function readResume(state: unknown): Resume | null {
  const resume = (state as { resume?: unknown } | null)?.resume
  if (typeof resume !== 'object' || resume === null) return null
  const { fen, color, san, levelId } = resume as Record<string, unknown>
  if (typeof fen !== 'string' || typeof san !== 'string') return null
  if (color !== 'w' && color !== 'b') return null

  try {
    const chess = new Chess(fen)
    if (chess.turn() !== color || chess.isGameOver()) return null
    chess.move(san)
  } catch {
    return null
  }

  const level = ENGINE_LEVELS.find((candidate) => candidate.id === levelId)
  return level ? { fen, color, san, levelId: level.id } : { fen, color, san }
}
