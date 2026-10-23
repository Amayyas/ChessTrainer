import KeyboardField from '@/components/Board/KeyboardField'

export interface SquareInputProps {
  /** The squares the champion can reach; none while it reappears. */
  moves: string[]
  /** Null while the champion has been eaten and has not reappeared yet. */
  championSquare: string | null
  /** Sends the champion to a square. True if it went. */
  onMove: (square: string) => boolean
  className?: string
}

const NBSP = '\u00a0'

/**
 * The Hunt's keyboard: the champion has one piece to move, so the field takes
 * only the square to go to, in either case.
 */
export default function SquareInput({
  moves,
  championSquare,
  onMove,
  className,
}: SquareInputProps) {
  return (
    <KeyboardField
      label="Jouer au clavier"
      example="Tapez la case où aller, par exemple d5."
      enabled={moves.length > 0}
      position={championSquare ?? ''}
      className={className}
      onSubmit={(text) => {
        if (!championSquare) {
          return { message: 'Votre pièce reparaît dans un instant.', invalid: false }
        }
        const square = text.trim().toLowerCase()
        if (!/^[a-h][1-8]$/.test(square)) {
          return {
            message: `«${NBSP}${text.trim()}${NBSP}» n’est pas une case${NBSP}: tapez sa colonne puis sa rangée, par exemple d5.`,
            invalid: true,
          }
        }
        if (!moves.includes(square)) {
          return { message: `Votre pièce ne peut pas aller en ${square}.`, invalid: true }
        }
        return onMove(square) ? 'played' : 'refused'
      }}
    />
  )
}
