import { ROUTES, type RoutePath } from '@/routes'

export interface NavItem {
  path: RoutePath
  label: string
  /** Unicode chess-piece glyph — avoids pulling in an icon dependency. */
  glyph: string
  /** Read by screen readers in place of the glyph (accessibility). */
  description: string
  /**
   * The mobile bottom bar exposes the dashboard and the 4 game modes, and
   * spends its sixth and last column on the button that opens the full menu.
   *
   * It used to spend that column on the profile, which left the leaderboard
   * reachable from no mobile screen at all — there is no header on small
   * widths, so the bar is the only chrome. Everything now lives in the sheet
   * behind that sixth column, the profile included.
   */
  inBottomBar: boolean
  /** Fallback for the bottom bar: at 375px an item only gets about 75px. */
  shortLabel?: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: ROUTES.dashboard,
    label: 'Tableau de bord',
    shortLabel: 'Tableau',
    glyph: '♔',
    description: 'Progression, défis du jour et activité récente',
    inBottomBar: true,
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
    inBottomBar: false,
  },
]

export const BOTTOM_BAR_ITEMS = NAV_ITEMS.filter((item) => item.inBottomBar)
