import type { MoveQuality } from '@/utils/evaluation'

/**
 * The game the landing prints, and the position its diagram shows: the Two
 * Knights after 4.Ng5 d5 5.exd5 Nxd5?, where the coach proposes 6.Nxf7, the
 * Fried Liver. The grades illustrate the coach's marks and are set by hand.
 *
 * The diagram's position, its last move and the coach's arrow are written out
 * rather than worked out on the page, which would send chess.js to every
 * visitor of the landing for one diagram. sampleGame.test.ts replays the game
 * and fails if any of them stops matching it.
 */
export const SAMPLE_GAME: ReadonlyArray<{ san: string; grade?: MoveQuality }> = [
  { san: 'e4' },
  { san: 'e5' },
  { san: 'Nf3' },
  { san: 'Nc6' },
  { san: 'Bc4', grade: 'excellent' },
  { san: 'Nf6' },
  { san: 'Ng5', grade: 'excellent' },
  { san: 'd5' },
  { san: 'exd5' },
  { san: 'Nxd5', grade: 'mistake' },
]

/** The coach's answer to the game's last move, drawn as the diagram's arrow. */
export const COACH_PROPOSAL = { san: 'Nxf7', from: 'g5', to: 'f7' } as const

/** The position after the game's last move, and that move, as the diagram shows them. */
export const DIAGRAM = {
  fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
  lastMove: { from: 'f6', to: 'd5' },
} as const

/**
 * The number a score prints before the move at `ply`, counted from 0 for
 * White's first: `6.` before a move of White's, `5…` before one of Black's.
 */
export function moveNumber(ply: number): string {
  const number = Math.floor(ply / 2) + 1
  return ply % 2 === 0 ? `${number}.` : `${number}…`
}
