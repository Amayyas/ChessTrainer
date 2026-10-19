import { useEffect, useRef } from 'react'
import GradeSign from '@/components/UI/GradeSign'
import Notation from '@/components/UI/Notation'
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

/**
 * A single move: the figurine notation, then the coach's grade if it has one.
 * The move being shown is set off as a printed score marks it, a tint over a
 * rule in the rubric, and is the list's current step for assistive tech.
 */
function MoveCell({
  san,
  quality,
  isCurrent,
}: {
  san: string
  quality: MoveQuality | null | undefined
  isCurrent: boolean
}) {
  const meta = quality ? MOVE_QUALITY[quality] : null
  return (
    <span
      aria-current={isCurrent ? 'step' : undefined}
      className={cn(
        'justify-self-start whitespace-nowrap px-2 pb-1 pt-1.5',
        isCurrent && 'border-b-2 border-rubric bg-rubric/10 pb-0.5',
      )}
    >
      <Notation san={san} />
      {quality && meta && (
        <>
          <GradeSign quality={quality} className="ml-[0.28em]" />
          <span className="sr-only">, {meta.label.toLowerCase()}</span>
        </>
      )}
    </span>
  )
}

/** The game as a printed score: numbered rows, White's move then Black's. */
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
      <p className={cn('py-6 text-center text-caption text-ink-soft', className)}>
        Aucun coup joué pour l'instant.
      </p>
    )
  }

  return (
    <ol
      ref={scrollRef}
      data-testid="move-history"
      className={cn('max-h-72 overflow-y-auto pr-1 text-body leading-[1.3] text-ink', className)}
    >
      {pairs.map((pair) => {
        const whiteIndex = (pair.number - 1) * 2
        const blackIndex = whiteIndex + 1
        return (
          <li key={pair.number} className="grid grid-cols-[2.25rem_1fr_1fr] items-baseline">
            <span className="font-semibold tabular-nums lining-nums">{pair.number}.</span>
            <MoveCell
              san={pair.white}
              quality={qualities?.[whiteIndex]}
              isCurrent={whiteIndex === highlightIndex}
            />
            {pair.black && (
              <MoveCell
                san={pair.black}
                quality={qualities?.[blackIndex]}
                isCurrent={blackIndex === highlightIndex}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
