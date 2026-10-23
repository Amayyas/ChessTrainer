import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { PieceSymbol, Square } from '@/utils/chess'
import { cn } from '@/utils/cn'

const CHOICES: ReadonlyArray<{ symbol: PieceSymbol; role: string; name: string }> = [
  { symbol: 'q', role: 'queen', name: 'Dame' },
  { symbol: 'r', role: 'rook', name: 'Tour' },
  { symbol: 'b', role: 'bishop', name: 'Fou' },
  { symbol: 'n', role: 'knight', name: 'Cavalier' },
]

interface PromotionPickerProps {
  /** The square the pawn promotes on. */
  square: Square
  color: 'white' | 'black'
  orientation: 'white' | 'black'
  onChoose: (piece: PieceSymbol) => void
  onCancel: () => void
}

/**
 * The choice of piece for a pawn on the last rank, which chessground leaves to
 * its host: four squares in a column over the promotion square, reaching into
 * the board, each the piece it would become. The first takes the focus, so the
 * keyboard can choose; Escape, or a press anywhere else on the board, takes the
 * pawn back.
 */
export default function PromotionPicker({
  square,
  color,
  orientation,
  onChoose,
  onCancel,
}: PromotionPickerProps) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
  }, [])

  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const column = orientation === 'white' ? file : 7 - file
  // The pawn promotes at the top of the board when it moves away from the
  // player who sits at the bottom, which is the side the board is turned to.
  const fromTop = color === orientation

  const cancelOutside = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCancel()
  }
  const cancelOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="absolute inset-0 z-20" onPointerDown={cancelOutside} onKeyDown={cancelOnEscape}>
      <div
        role="group"
        aria-label="Promotion : choisissez une pièce"
        style={{ left: `${column * 12.5}%`, [fromTop ? 'top' : 'bottom']: 0 }}
        className={cn(
          'absolute flex w-[12.5%] border-2 border-ink bg-paper-bright',
          fromTop ? 'flex-col' : 'flex-col-reverse',
        )}
      >
        {CHOICES.map((choice, index) => (
          <button
            key={choice.symbol}
            ref={index === 0 ? first : undefined}
            type="button"
            onClick={() => onChoose(choice.symbol)}
            className={cn(
              'board-piece aspect-square w-full hover:bg-paper-deep',
              choice.role,
              color,
            )}
          >
            <span className="sr-only">{choice.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
