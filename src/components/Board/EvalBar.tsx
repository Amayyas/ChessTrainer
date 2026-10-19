import type { CSSProperties } from 'react'
import { winningChances, type WhiteEval } from '@/utils/evaluation'
import { formatSigned } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface EvalBarProps {
  evaluation: WhiteEval | null
  /** Matches the board orientation so the winning side stays on the near end. */
  orientation?: 'white' | 'black'
  className?: string
}

/**
 * Formats an evaluation the way a French chess column does: `+1,2`, `−0,4`,
 * `M3`, or `#`.
 */
function formatEval(evaluation: WhiteEval): string {
  // A mate that has landed is distance zero, and "M0" reads as a mate in no
  // moves — which is not a thing. The game is over; the bar names it.
  if (evaluation.mate === 0) return '#'
  if (evaluation.mate !== null) return `M${Math.abs(evaluation.mate)}`
  return formatSigned(evaluation.cp / 100)
}

/**
 * The gauge beside the diagram: a narrow ruled column, Black's share inked
 * from Black's end, a tick at the middle, and the evaluation in figures
 * under it. On a phone it lies across the top of the board instead, the
 * figures first.
 *
 * It does not slide to a new value: nothing moves on the page but a piece and
 * the coach's arrow.
 */
export default function EvalBar({ evaluation, orientation = 'white', className }: EvalBarProps) {
  const whiteShare = evaluation ? winningChances(evaluation.cp) : 0.5
  const blackPercent = 100 - Math.round(whiteShare * 100)
  const label = evaluation ? formatEval(evaluation) : '–'
  // "#" is read out as "number sign", which tells a screen reader user nothing.
  const spoken = evaluation?.mate === 0 ? 'échec et mat' : label

  // Black's end is the top, unless the board is flipped to Black's view.
  const flipped = orientation === 'black'

  return (
    <div
      role="img"
      aria-label={evaluation ? `Évaluation ${spoken}` : 'Évaluation indisponible'}
      style={{ '--black': `${blackPercent}%` } as CSSProperties}
      className={cn(
        'flex shrink-0 items-center gap-3',
        'max-sm:w-full sm:w-[30px] sm:flex-col-reverse sm:justify-end sm:gap-0',
        className,
      )}
    >
      <span className="text-caption font-semibold tabular-nums lining-nums sm:pt-3">{label}</span>
      <div className="relative h-2.5 flex-1 border border-ink bg-paper-bright sm:h-auto sm:w-2.5 sm:self-stretch">
        <div
          className={cn(
            'absolute bg-ink',
            'max-sm:inset-y-0 max-sm:right-0 max-sm:w-[var(--black)]',
            'sm:inset-x-0 sm:h-[var(--black)]',
            flipped ? 'sm:bottom-0' : 'sm:top-0',
          )}
        />
        {/* The middle: equal chances. */}
        <span
          aria-hidden="true"
          className="absolute border-ink max-sm:-inset-y-1 max-sm:left-1/2 max-sm:border-l sm:-inset-x-1 sm:top-1/2 sm:border-t"
        />
      </div>
    </div>
  )
}
