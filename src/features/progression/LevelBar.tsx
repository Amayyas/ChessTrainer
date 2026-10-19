import Gauge from '@/components/UI/Gauge'
import type { LevelProgress } from '@/features/progression/levels'
import { cn } from '@/utils/cn'

interface LevelBarProps {
  progress: LevelProgress
  className?: string
}

/** Level and progress towards the next one: the level as a heading, the XP beside, the gauge under. */
export default function LevelBar({ progress, className }: LevelBarProps) {
  const label = progress.isMaxLevel
    ? 'Niveau maximum atteint'
    : `${progress.xpIntoLevel} / ${progress.xpForLevel} XP`

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-heading font-semibold">Niveau {progress.level}</span>
        <span className="text-caption tabular-nums lining-nums text-ink-soft">{label}</span>
      </div>
      <Gauge value={progress.ratio} label={`Progression du niveau ${progress.level}`} />
    </div>
  )
}
