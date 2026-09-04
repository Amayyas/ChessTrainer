import { ENGINE_LEVELS } from '@/engine/levels'
import type { BadgeVariant } from '@/components/UI'
import { ROUTES, type RoutePath } from '@/routes'

/**
 * The four game modes, in the order they are offered.
 *
 * Shared by the dashboard and the public landing so the two never drift: a mode
 * renamed or a badge changed in one place changes in both.
 */
export interface ModeCard {
  to: RoutePath
  glyph: string
  title: string
  description: string
  badge: string
  badgeVariant: BadgeVariant
}

/**
 * Read from the ladder rather than written out. The battle card said "cinq
 * niveaux, de 800 à 2200 Elo" for two releases after the ladder had grown to six
 * levels with measured figures: copy that restates data drifts from it silently.
 */
const BATTLE_FLOOR = ENGINE_LEVELS[0]!.elo
const BATTLE_CEILING = ENGINE_LEVELS[ENGINE_LEVELS.length - 1]!.elo

export const MODES: ModeCard[] = [
  {
    to: ROUTES.coach,
    glyph: '♞',
    title: 'Coach IA',
    description: 'Analysez chaque coup avec Stockfish et progressez à votre rythme.',
    badge: 'Apprentissage',
    badgeVariant: 'gold',
  },
  {
    to: ROUTES.battle,
    glyph: '♜',
    title: 'Affrontement',
    description: `Défiez l'IA sur ${ENGINE_LEVELS.length} niveaux, de ${BATTLE_FLOOR} à ${BATTLE_CEILING} Elo.`,
    badge: `${ENGINE_LEVELS.length} niveaux`,
    badgeVariant: 'neutral',
  },
  {
    to: ROUTES.puzzle,
    glyph: '♝',
    title: 'Puzzles',
    description: 'Résolvez des positions tactiques classées par thème.',
    badge: 'Tactique',
    badgeVariant: 'neutral',
  },
  {
    to: ROUTES.hunt,
    glyph: '♟',
    title: 'Chasse aux Pièces',
    description: 'Capturez un maximum de pièces en 60 secondes.',
    badge: 'Arcade',
    badgeVariant: 'gold',
  },
]
