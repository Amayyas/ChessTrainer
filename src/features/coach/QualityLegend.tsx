import GradeSign from '@/components/UI/GradeSign'
import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'

/**
 * What the marks beside each move mean.
 *
 * `!`, `?!`, `?` and `??` are standard chess annotation and a player may well
 * know them; ★, ✓✓ and ✓ are this app's own, and seven tiers is more than
 * anyone should be asked to infer. Set as a key of signs: one rule between
 * each, the sign in a column of its own so the words line up.
 */
export default function QualityLegend() {
  return (
    <details className="group border-t border-ink/30">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 text-caption transition-colors hover:text-rubric [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-flex size-[1.2rem] shrink-0 items-center justify-center border border-ink font-semibold leading-none"
        >
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">–</span>
        </span>
        Que signifient les symboles ?
      </summary>
      <ul aria-label="Barème de notation des coups" className="pb-2.5">
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
    </details>
  )
}
