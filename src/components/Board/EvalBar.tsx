import { winningChances, type WhiteEval } from '@/utils/evaluation'
import { cn } from '@/utils/cn'

export interface EvalBarProps {
  evaluation: WhiteEval | null
  /** Matches the board orientation so the winning side stays on the near end. */
  orientation?: 'white' | 'black'
  className?: string
}

/** Formats an evaluation the way chess UIs do: `+1.2`, `-0.4`, `M3`, or `#`. */
function formatEval(evaluation: WhiteEval): string {
  // A mate that has landed is distance zero, and "M0" reads as a mate in no
  // moves — which is not a thing. The game is over; the bar names it.
  if (evaluation.mate === 0) return '#'
  if (evaluation.mate !== null) return `M${Math.abs(evaluation.mate)}`
  const pawns = evaluation.cp / 100
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(1)}`
}

/**
 * Vertical advantage bar. The white segment grows with
 * White's winning chances; the numeric evaluation sits on the leading side.
 */
export default function EvalBar({ evaluation, orientation = 'white', className }: EvalBarProps) {
  const whiteShare = evaluation ? winningChances(evaluation.cp) : 0.5
  const whitePercent = Math.round(whiteShare * 100)
  const whiteLeads = evaluation ? evaluation.cp >= 0 : true
  const label = evaluation ? formatEval(evaluation) : '–'
  // "#" is read out as "number sign", which tells a screen reader user nothing.
  const spoken = evaluation?.mate === 0 ? 'échec et mat' : label

  // White fills from the bottom, unless the board is flipped to Black's view.
  const flipped = orientation === 'black'

  return (
    <div
      role="img"
      aria-label={evaluation ? `Évaluation ${spoken}` : 'Évaluation indisponible'}
      className={cn(
        'relative flex w-6 shrink-0 flex-col overflow-hidden rounded-md bg-ebene',
        className,
      )}
    >
      <div
        className="absolute inset-x-0 bg-ivoire transition-[height] duration-500 ease-out"
        style={{ height: `${whitePercent}%`, [flipped ? 'top' : 'bottom']: 0 }}
      />
      <span
        className={cn(
          'absolute inset-x-0 text-center text-[10px] font-bold tabular-nums',
          whiteLeads ? 'text-ebene' : 'text-ivoire',
          whiteLeads === !flipped ? 'bottom-1' : 'top-1',
        )}
      >
        {label}
      </span>
    </div>
  )
}
