import { formatClock } from '@/hooks/useChessClock'
import { cn } from '@/utils/cn'

interface ClockDisplayProps {
  label: string
  ms: number
  /** This side's clock is currently running. */
  isActive: boolean
}

const LOW_TIME_MS = 20_000

/**
 * One player's clock, as a ruled row: the side in capitals, the time in
 * figures. The running clock is set in reverse, paper on ink, as a chosen
 * option is. Under twenty seconds it turns to the rubric — as a block when it
 * is running, since rubric figures on ink would not read (2.6:1), and as
 * rubric figures on the paper otherwise.
 */
export default function ClockDisplay({ label, ms, isActive }: ClockDisplayProps) {
  const isLow = ms <= LOW_TIME_MS

  return (
    <div
      className={cn(
        'flex items-baseline justify-between border border-ink px-3 py-2',
        isActive && (isLow ? 'border-rubric bg-rubric text-paper-bright' : 'bg-ink text-paper'),
        !isActive && isLow && 'text-rubric',
      )}
    >
      <span className="text-kicker font-semibold uppercase">{label}</span>
      <span
        aria-label={`${label} : ${formatClock(ms)}`}
        className="text-title font-semibold tabular-nums lining-nums"
      >
        {formatClock(ms)}
      </span>
    </div>
  )
}
