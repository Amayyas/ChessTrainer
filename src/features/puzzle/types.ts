import type { Color } from '@/utils/chess'

export interface Puzzle {
  id: string
  /** Position to solve, with the solver to move. */
  fen: string
  /**
   * Solution in UCI, alternating solver and opponent and starting with the
   * solver's move. Even indexes are the solver's moves.
   */
  solution: string[]
  theme: string
  /** Estimated difficulty rating. */
  rating: number
  sideToMove: Color
}

export type Difficulty = 'debutant' | 'intermediaire' | 'avance'

/** Difficulty bands. */
export function difficultyOf(rating: number): Difficulty {
  if (rating < 1200) return 'debutant'
  if (rating <= 1800) return 'intermediaire'
  return 'avance'
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
}

/**
 * French labels for the themes the generator can derive on its own. Lichess's
 * hand-curated tags (déviation, surcharge, zugzwang…) cannot be imported here,
 * so the set is limited to what is reliably detectable from the engine's line.
 */
export function themeLabel(theme: string): string {
  const mate = theme.match(/^mat-en-(\d+)$/)
  if (mate) return `Mat en ${mate[1]}`
  if (theme === 'fourchette') return 'Fourchette'
  return 'Gain de matériel'
}
