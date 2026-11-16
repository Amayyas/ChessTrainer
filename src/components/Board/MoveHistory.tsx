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
  /**
   * The position the moves start from, when it is not the opening one. Its
   * move number and side to move set the first row: a game taken up before
   * Black's twelfth move reads "12. … ♛xb2", not "1. ♛xb2".
   */
  startFen?: string
  className?: string
}

interface MovePair {
  number: number
  /** Indexes into `moves`; null for the White half of a row Black opens. */
  white: number | null
  black: number | null
}

/** The move number and side to move a FEN starts from; the opening position without one. */
function startOf(fen: string | undefined): { number: number; blackFirst: boolean } {
  const fields = fen?.split(' ') ?? []
  const number = Number(fields[5])
  return {
    number: Number.isInteger(number) && number > 0 ? number : 1,
    blackFirst: fields[1] === 'b',
  }
}

function toPairs(count: number, startFen: string | undefined): MovePair[] {
  const start = startOf(startFen)
  const pairs: MovePair[] = []
  let index = 0
  if (start.blackFirst && count > 0) {
    pairs.push({ number: start.number, white: null, black: 0 })
    index = 1
  }
  for (; index < count; index += 2) {
    pairs.push({
      number: start.number + pairs.length,
      white: index,
      black: index + 1 < count ? index + 1 : null,
    })
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
  startFen,
  className,
}: MoveHistoryProps) {
  const scrollRef = useRef<HTMLOListElement>(null)
  const pairs = toPairs(moves.length, startFen)
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
      {pairs.map((pair) => (
        <li key={pair.number} className="grid grid-cols-[2.25rem_1fr_1fr] items-baseline">
          <span className="font-semibold tabular-nums lining-nums">{pair.number}.</span>
          {pair.white === null ? (
            // The score's ellipsis for a row Black opens: White's move was
            // played before the position this list starts from. Silent to a
            // screen reader, which hears the number and then Black's move.
            <span aria-hidden="true" className="px-2 pb-1 pt-1.5 text-ink-soft">
              …
            </span>
          ) : (
            <MoveCell
              san={moves[pair.white]!}
              quality={qualities?.[pair.white]}
              isCurrent={pair.white === highlightIndex}
            />
          )}
          {pair.black !== null && (
            <MoveCell
              san={moves[pair.black]!}
              quality={qualities?.[pair.black]}
              isCurrent={pair.black === highlightIndex}
            />
          )}
        </li>
      ))}
    </ol>
  )
}
