import { useEffect, useRef } from 'react'
import { MOVE_QUALITY, type MoveQuality } from '@/utils/evaluation'
import { cn } from '@/utils/cn'

export interface MoveHistoryProps {
  /** Moves in algebraic notation, e.g. ['e4', 'e5', 'Nf3']. */
  moves: string[]
  /** Optional coach classification per move, parallel to `moves`. */
  qualities?: (MoveQuality | null)[]
  /** Move index to highlight; defaults to the last move. Used during replay. */
  activeIndex?: number
  className?: string
}

interface MovePair {
  number: number
  white: string
  black?: string
}

function toPairs(moves: string[]): MovePair[] {
  const pairs: MovePair[] = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ number: i / 2 + 1, white: moves[i]!, black: moves[i + 1] })
  }
  return pairs
}

/** A single move cell: notation plus optional coach quality symbol. */
function MoveCell({
  san,
  quality,
  isLast,
}: {
  san: string
  quality: MoveQuality | null | undefined
  isLast: boolean
}) {
  const meta = quality ? MOVE_QUALITY[quality] : null
  return (
    <span
      className={cn(
        'inline-flex min-w-14 items-center gap-0.5 rounded px-1.5 py-0.5 font-medium text-ebene',
        isLast && 'bg-or/30',
      )}
    >
      {san}
      {meta?.symbol && <span className={cn('font-bold', meta.color)}>{meta.symbol}</span>}
    </span>
  )
}

/** Move list in algebraic notation, paired by move number. */
export default function MoveHistory({
  moves,
  qualities,
  activeIndex,
  className,
}: MoveHistoryProps) {
  const scrollRef = useRef<HTMLOListElement>(null)
  const pairs = toPairs(moves)
  const highlightIndex = activeIndex ?? moves.length - 1

  // Keep the latest move in view as the game grows.
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [moves.length])

  if (moves.length === 0) {
    return (
      <p className={cn('py-6 text-center text-sm text-ardoise', className)}>
        Aucun coup joué pour l'instant.
      </p>
    )
  }

  return (
    <ol ref={scrollRef} className={cn('max-h-72 overflow-y-auto pr-1', className)}>
      {pairs.map((pair) => {
        const whiteIndex = (pair.number - 1) * 2
        const blackIndex = whiteIndex + 1
        return (
          <li key={pair.number} className="flex items-center gap-2 py-0.5 text-sm">
            <span className="w-7 shrink-0 text-right text-xs font-medium text-ardoise">
              {pair.number}.
            </span>
            <MoveCell
              san={pair.white}
              quality={qualities?.[whiteIndex]}
              isLast={whiteIndex === highlightIndex}
            />
            {pair.black && (
              <MoveCell
                san={pair.black}
                quality={qualities?.[blackIndex]}
                isLast={blackIndex === highlightIndex}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
