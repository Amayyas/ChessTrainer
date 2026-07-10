import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

export interface MoveHistoryProps {
  /** Moves in algebraic notation, e.g. ['e4', 'e5', 'Nf3']. */
  moves: string[]
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

/** Move list in algebraic notation, paired by move number (spec module M3). */
export default function MoveHistory({ moves, className }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLOListElement>(null)
  const pairs = toPairs(moves)
  const lastIndex = moves.length - 1

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
            <span
              className={cn(
                'min-w-14 rounded px-1.5 py-0.5 font-medium text-ebene',
                whiteIndex === lastIndex && 'bg-or/30',
              )}
            >
              {pair.white}
            </span>
            {pair.black && (
              <span
                className={cn(
                  'min-w-14 rounded px-1.5 py-0.5 font-medium text-ebene',
                  blackIndex === lastIndex && 'bg-or/30',
                )}
              >
                {pair.black}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
