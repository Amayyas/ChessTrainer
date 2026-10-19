import GradeSign from '@/components/UI/GradeSign'
import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'
import { cn } from '@/utils/cn'

/**
 * The key of signs: every grade, strongest first, one rule between each and
 * the sign in a column of its own so the words line up. The coach's legend
 * and the landing both print it, from the one table.
 */
export default function GradeKey({ className }: { className?: string }) {
  return (
    <ul aria-label="Barème de notation des coups" className={cn(className)}>
      {MOVE_QUALITY_ORDER.map((quality) => (
        <li
          key={quality}
          className="grid grid-cols-[3.25rem_1fr] items-baseline border-t border-ink/30 py-[7px] text-caption first:border-t-0 first:pt-0.5"
        >
          <GradeSign quality={quality} className="text-[1.2em] leading-[1.2]" />
          <span>{MOVE_QUALITY[quality].label}</span>
        </li>
      ))}
    </ul>
  )
}
