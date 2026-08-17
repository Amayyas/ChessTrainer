import type { ProgressionStats } from '@/store/useProgressionStore'

export interface Badge {
  id: string
  label: string
  description: string
  glyph: string
  /** Whether the player's stats have earned it. */
  isEarned: (stats: ProgressionStats) => boolean
}

/**
 * Unlockable badges. The first four are the core set; the rest spread the
 * collection across the four game modes.
 */
export const BADGES: readonly Badge[] = [
  {
    id: 'first-mate',
    label: 'Premier mat',
    description: "Gagner une partie par échec et mat contre l'IA.",
    glyph: '♔',
    isEarned: (stats) => stats.checkmatesDelivered >= 1,
  },
  {
    id: 'streak-7',
    label: 'Série de 7 jours',
    description: 'Résoudre des puzzles sept jours de suite.',
    glyph: '🔥',
    isEarned: (stats) => stats.bestPuzzleStreak >= 7,
  },
  {
    id: 'puzzles-100',
    label: '100 puzzles',
    description: 'Résoudre cent puzzles tactiques.',
    glyph: '🧩',
    isEarned: (stats) => stats.puzzlesSolved >= 100,
  },
  {
    id: 'perfect-score',
    label: 'Score parfait',
    description: 'Résoudre un puzzle sans indice ni erreur.',
    glyph: '⭐',
    isEarned: (stats) => stats.flawlessPuzzles >= 1,
  },
  {
    id: 'first-win',
    label: 'Première victoire',
    description: "Battre l'IA pour la première fois.",
    glyph: '🏆',
    isEarned: (stats) => stats.gamesWon >= 1,
  },
  {
    id: 'veteran',
    label: 'Vétéran',
    description: "Disputer vingt-cinq parties contre l'IA.",
    glyph: '⚔',
    isEarned: (stats) => stats.gamesPlayed >= 25,
  },
  {
    id: 'hunter',
    label: 'Chasseur',
    description: 'Capturer cinquante pièces à la Chasse.',
    glyph: '🎯',
    isEarned: (stats) => stats.huntCaptures >= 50,
  },
  {
    id: 'precision',
    label: 'Précision',
    description: 'Tenir 80 % de précision sur au moins trois parties analysées.',
    glyph: '📐',
    isEarned: (stats) => stats.battleAccuracySamples >= 3 && (stats.battleAccuracy ?? 0) >= 80,
  },
]

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((badge) => badge.id === id)
}

/** Every badge the stats currently earn, unlocked or not. */
export function earnedBadgeIds(stats: ProgressionStats): string[] {
  return BADGES.filter((badge) => badge.isEarned(stats)).map((badge) => badge.id)
}
