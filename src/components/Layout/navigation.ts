import { ROUTES, type RoutePath } from '@/routes'

export interface NavItem {
  path: RoutePath
  label: string
  /** Glyphe Unicode d'une piece d'echecs — evite une dependance d'icones. */
  glyph: string
  /** Lu par les lecteurs d'ecran a la place du glyphe (section 4.2, accessibilite). */
  description: string
  /**
   * La bottom bar mobile n'expose que les 4 modes et le profil (section 4.3).
   * Accueil et Classement restent atteignables depuis le tableau de bord.
   */
  inBottomBar: boolean
  /** Repli pour la bottom bar : a 375px, une entree ne dispose que de ~75px. */
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
