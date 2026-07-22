import type { LevelProgress } from '@/features/progression/levels'
import { cn } from '@/utils/cn'

interface LevelBarProps {
  progress: LevelProgress
  /** Rendered on the dark hero rather than on a white card. */
  onDark?: boolean
  className?: string
}

/** Level and progress towards the next one (spec section 2.5). */
export default function LevelBar({ progress, onDark = false, className }: LevelBarProps) {
  const percent = Math.round(progress.ratio * 100)
  const label = progress.isMaxLevel
    ? 'Niveau maximum atteint'
    : `${progress.xpIntoLevel} / ${progress.xpForLevel} XP`

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span
          className={cn('font-display text-lg font-bold', onDark ? 'text-ivoire' : 'text-ebene')}
        >
          Niveau {progress.level}
        </span>
        <span className={cn('text-xs tabular-nums', onDark ? 'text-ivoire/70' : 'text-ardoise')}>
          {label}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progression du niveau ${progress.level}`}
        className={cn(
          'h-2 w-full overflow-hidden rounded-full',
          onDark ? 'bg-white/15' : 'bg-ebene/10',
        )}
      >
        <div
          className="h-full rounded-full bg-or transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
