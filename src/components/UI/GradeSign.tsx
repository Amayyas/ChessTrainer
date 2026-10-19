import { MOVE_QUALITY, type MoveQuality } from '@/utils/evaluation'
import { inFigurineFace } from '@/utils/notation'
import { cn } from '@/utils/cn'

/**
 * The sign a grade prints beside a move: ★, !, ✓✓, ✓ in ink, ?!, ? and ?? in
 * the rubric. The star and the ticks are drawn from the figurine face, a size
 * smaller, so they sit level with the exclamation and question marks set in
 * the text's own bold.
 *
 * Hidden from assistive tech: a sign read aloud is "black star" or "check
 * mark", and the caller says the grade in words beside it.
 */
export default function GradeSign({
  quality,
  className,
}: {
  quality: MoveQuality
  className?: string
}) {
  const meta = MOVE_QUALITY[quality]
  return (
    <span
      aria-hidden="true"
      className={cn(
        inFigurineFace(meta.symbol) ? 'font-figurine text-[0.8em] font-normal' : 'font-bold',
        meta.tone === 'rubric' ? 'text-rubric' : 'text-ink',
        className,
      )}
    >
      {meta.symbol}
    </span>
  )
}
