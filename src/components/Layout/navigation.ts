import { ROUTES, type RoutePath } from '@/routes'

export interface NavItem {
  path: RoutePath
  label: string
  /** Unicode chess-piece glyph — avoids pulling in an icon dependency. */
  glyph: string
  /** Read by screen readers in place of the glyph (spec section 4.2, accessibility). */
  description: string
  /**
   * The mobile bottom bar only exposes the 4 game modes and the profile (spec section 4.3).
   * Home and Leaderboard stay reachable from the dashboard.
   */
  inBottomBar: boolean
  /** Fallback for the bottom bar: at 375px an item only gets about 75px. */
  shortLabel?: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: ROUTES.home,
    label: 'Accueil',
    glyph: '♔',
    description: 'Tableau de bord',
    inBottomBar: false,
  },
  {
    path: ROUTES.coach,
    label: 'Coach',
    glyph: '♞',
    description: 'Mode apprentissage avec IA',
    inBottomBar: true,
  },
  {
    path: ROUTES.battle,
    label: 'Affrontement',
    shortLabel: 'Duel',
    glyph: '♜',
    description: "Jouer contre l'IA",
    inBottomBar: true,
  },
  {
    path: ROUTES.puzzle,
    label: 'Puzzle',
    glyph: '♝',
    description: 'Puzzles tactiques',
    inBottomBar: true,
  },
  {
    path: ROUTES.hunt,
    label: 'Chasse',
    glyph: '♟',
    description: 'Mode arcade Chasse aux Pieces',
    inBottomBar: true,
  },
  {
    path: ROUTES.leaderboard,
    label: 'Classement',
    glyph: '♛',
    description: 'Classement mondial',
    inBottomBar: false,
  },
  {
    path: ROUTES.profile,
    label: 'Profil',
    glyph: '♚',
    description: 'Profil et progression',
    inBottomBar: true,
  },
]

export const BOTTOM_BAR_ITEMS = NAV_ITEMS.filter((item) => item.inBottomBar)
