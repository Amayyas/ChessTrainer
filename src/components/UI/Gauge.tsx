import { cn } from '@/utils/cn'

export interface GaugeProps {
  /** How far along, from 0 to 1; clamped. */
  value: number
  /** What is being measured, for assistive tech. */
  label: string
  className?: string
}

/**
 * A measure of progress drawn as a paper draws one: an ink bar in a ruled
 * frame, square, still. It does not slide to its new length — nothing in the
 * newsprint interface moves but a piece and the coach's arrow.
 */
export default function Gauge({ value, label, className }: GaugeProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full border border-ink bg-paper-bright', className)}
    >
      <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
    </div>
  )
}
