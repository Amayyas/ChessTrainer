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

/** The bands in order, easiest first — for a difficulty picker. */
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[]

/**
 * French labels for the puzzle themes. The slugs are assigned by
 * scripts/import-lichess-puzzles.mjs, which maps a Lichess tag to one of these
 * — mates keep the `mat-en-N` form, since the dataset test reads N back out of
 * it. `gain-materiel` is the catch-all for a tactic with no sharper motif.
 */
const THEME_LABELS: Record<string, string> = {
  fourchette: 'Fourchette',
  clouage: 'Clouage',
  enfilade: 'Enfilade',
  'attaque-decouverte': 'Attaque à la découverte',
  'echec-double': 'Échec double',
  sacrifice: 'Sacrifice',
  deviation: 'Déviation',
  attraction: 'Attraction',
  'piece-en-prise': 'Pièce en prise',
  'gain-materiel': 'Gain de matériel',
}

export function themeLabel(theme: string): string {
  const mate = theme.match(/^mat-en-(\d+)$/)
  if (mate) return `Mat en ${mate[1]}`
  return THEME_LABELS[theme] ?? 'Gain de matériel'
}
