/**
 * The endgames every player should know, to play out against Stockfish until
 * they are won — or held — without thinking.
 *
 * What a position is worth was measured, not recalled: each was searched to
 * depth 22 by the vendored Stockfish (20 November 2026). The wins read as a
 * forced mate or several pawns up for the side to move, the holds as 0.00.
 * Two first drafts failed that check and were replaced — a king-and-pawn
 * "defence" that was in fact lost, and a king-and-pawn "win" that was a draw.
 */

/**
 * What the player must achieve:
 * - `mate`: deliver checkmate;
 * - `promote`: queen the pawn, the position still won afterwards;
 * - `hold`: survive the engine's attempts without the position being lost.
 */
export type EndgameGoal = 'mate' | 'promote' | 'hold'

export interface Endgame {
  id: string
  title: string
  goal: EndgameGoal
  /** The starting position. The player takes the side to move. */
  fen: string
  /** The idea to play by, shown beside the board. */
  principle: string
}

export const ENDGAMES: readonly Endgame[] = [
  {
    id: 'mat-dame',
    title: 'Le mat avec la dame',
    goal: 'mate',
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    principle:
      'Repoussez le roi vers un bord avec la dame, à un saut de cavalier de lui, sans jamais le pater. Amenez ensuite votre roi, et matez.',
  },
  {
    id: 'mat-escalier',
    title: 'Le mat de l’escalier',
    goal: 'mate',
    fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1',
    principle:
      'Les deux tours avancent l’une après l’autre, chacune coupant une rangée au roi, jusqu’au bord. Votre roi n’a pas besoin de s’en mêler.',
  },
  {
    id: 'mat-tour',
    title: 'Le mat avec la tour',
    goal: 'mate',
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    principle:
      'La tour enferme le roi dans une boîte ; votre roi vient lui faire face, et la tour rétrécit la boîte ou donne échec. Gardez la tour loin du roi adverse.',
  },
  {
    id: 'pion-roi-devant',
    title: 'Roi et pion : le roi devant',
    goal: 'promote',
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
    principle:
      'Votre roi en sixième rangée, devant son pion, gagne quel que soit le trait. Gagnez les cases devant le pion avec le roi, puis poussez-le jusqu’à la dame.',
  },
  {
    id: 'opposition',
    title: 'Roi et pion : la défense par l’opposition',
    goal: 'hold',
    fen: '3k4/8/8/3K4/3P4/8/8/8 b - - 0 1',
    principle:
      'Restez devant le pion et prenez l’opposition : à chaque pas du roi adverse, répondez par celui qui vous replace face à lui. Laissez-le vous dépasser, et le pion passe.',
  },
  {
    id: 'lucena',
    title: 'La position de Lucena',
    goal: 'promote',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    principle:
      'Coupez d’abord le roi adverse avec la tour, puis « construisez le pont » : la tour en quatrième rangée abritera votre roi des échecs quand il sortira devant son pion.',
  },
  {
    id: 'philidor',
    title: 'La défense Philidor',
    goal: 'hold',
    fen: '4k3/8/r7/4PK2/8/8/8/1R6 b - - 0 1',
    principle:
      'Gardez votre tour sur votre troisième rangée pour barrer la route au roi. Dès que le pion y avance, passez derrière lui et donnez échec par l’arrière, sans fin.',
  },
]

/** The goal as the player reads it. */
export const GOAL_LABELS: Record<EndgameGoal, string> = {
  mate: 'Matez',
  promote: 'Promouvez',
  hold: 'Tenez la nulle',
}
