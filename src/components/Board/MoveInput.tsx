import KeyboardField from '@/components/Board/KeyboardField'
import type { PieceSymbol, Square } from '@/utils/chess'
import { readMove, type MovePosition } from '@/utils/moveText'

export interface MoveInputProps extends MovePosition {
  /** Whether the board takes a move now. */
  enabled: boolean
  /** Plays a move, as the board's own onMove does. True if it was applied. */
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  /** What to say when a move is sent while the board takes none. */
  idleMessage?: string
  className?: string
}

/**
 * The keyboard of a chess board: a move typed in French notation or from
 * square to square, and played on Enter.
 */
export default function MoveInput({
  fen,
  turn,
  getLegalTargets,
  isPromotion,
  enabled,
  onMove,
  idleMessage = 'Aucun coup n’est attendu pour l’instant.',
  className,
}: MoveInputProps) {
  return (
    <KeyboardField
      label="Jouer au clavier"
      example="Par exemple e4, Cf3, O-O, e8=D ou e2e4."
      enabled={enabled}
      position={fen}
      className={className}
      onSubmit={(text) => {
        // The FEN says whose move it is; a board waiting on the other side, as
        // a puzzle does while its reply is on the way, takes nothing either.
        if (!enabled || fen.split(' ')[1] !== turn) {
          return {
            message: enabled ? 'Ce n’est pas à vous de jouer.' : idleMessage,
            invalid: false,
          }
        }
        const move = readMove(text, { fen, turn, getLegalTargets, isPromotion })
        if ('error' in move) return { message: move.error, invalid: true }
        // Refused by the page — a puzzle's wrong answer, which the page says
        // itself.
        return onMove(move.from, move.to, move.promotion) ? 'played' : 'refused'
      }}
    />
  )
}
