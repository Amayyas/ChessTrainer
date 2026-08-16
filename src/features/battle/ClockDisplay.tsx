import { formatClock } from '@/hooks/useChessClock'
import { cn } from '@/utils/cn'

interface ClockDisplayProps {
  label: string
  ms: number
  /** This side's clock is currently running. */
  isActive: boolean
}

const LOW_TIME_MS = 20_000

/** One player's clock. */
export default function ClockDisplay({ label, ms, isActive }: ClockDisplayProps) {
  const isLow = ms <= LOW_TIME_MS

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl px-3 py-2 transition-colors',
        isActive ? 'bg-ebene text-ivoire' : 'bg-ebene/5 text-ardoise',
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        aria-label={`${label} : ${formatClock(ms)}`}
        className={cn(
          'font-display text-xl font-bold tabular-nums',
          isLow && (isActive ? 'text-red-400' : 'text-red-600'),
        )}
      >
        {formatClock(ms)}
      </span>
    </div>
  )
}
