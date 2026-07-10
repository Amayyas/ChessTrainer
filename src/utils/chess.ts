import { Chess, type Color, type Square } from 'chess.js'

export type { Color, PieceSymbol, Square } from 'chess.js'

export type GameOverReason =
  'checkmate' | 'stalemate' | 'threefold' | 'fifty-move' | 'insufficient' | 'draw'

export interface GameStatus {
  isOver: boolean
  isCheck: boolean
  /** Side that delivered mate, or null when the game is not a checkmate. */
  winner: Color | null
  reason: GameOverReason | null
}

/** Locates the king of the given colour, e.g. to highlight it while in check. */
export function findKingSquare(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square
      }
    }
  }
  return null
}

/** Derives a human-readable game status from a chess.js instance. */
export function getGameStatus(chess: Chess): GameStatus {
  const isCheck = chess.isCheck()

  if (chess.isCheckmate()) {
    // The side to move is checkmated, so the other side won.
    return { isOver: true, isCheck, winner: chess.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' }
  }

  if (!chess.isGameOver()) {
    return { isOver: false, isCheck, winner: null, reason: null }
  }

  let reason: GameOverReason = 'draw'
  if (chess.isStalemate()) reason = 'stalemate'
  else if (chess.isThreefoldRepetition()) reason = 'threefold'
  else if (chess.isDrawByFiftyMoves()) reason = 'fifty-move'
  else if (chess.isInsufficientMaterial()) reason = 'insufficient'

  return { isOver: true, isCheck, winner: null, reason }
}

/** French label for a status, shown to the user (spec targets French personas). */
export function describeStatus(status: GameStatus, turn: Color): string {
  const sideToMove = turn === 'w' ? 'aux blancs' : 'aux noirs'

  if (!status.isOver) {
    const trait = turn === 'w' ? 'Trait aux blancs' : 'Trait aux noirs'
    return status.isCheck ? `Échec — ${trait.toLowerCase()}` : trait
  }

  switch (status.reason) {
    case 'checkmate':
      return status.winner === 'w'
        ? 'Échec et mat — les blancs gagnent'
        : 'Échec et mat — les noirs gagnent'
    case 'stalemate':
      return `Pat — partie nulle (${sideToMove})`
    case 'threefold':
      return 'Nulle par triple répétition'
    case 'fifty-move':
      return 'Nulle par la règle des 50 coups'
    case 'insufficient':
      return 'Nulle — matériel insuffisant'
    default:
      return 'Partie nulle'
  }
}

/** Creates a fresh game, optionally from a FEN. Returns null if the FEN is invalid. */
export function createGame(fen?: string): Chess | null {
  try {
    return fen ? new Chess(fen) : new Chess()
  } catch {
    return null
  }
}
