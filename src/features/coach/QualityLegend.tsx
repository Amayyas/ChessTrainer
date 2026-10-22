import GradeKey from '@/components/UI/GradeKey'

/**
 * What the marks beside each move mean, folded under the move list.
 *
 * `!`, `?!`, `?` and `??` are standard chess annotation and a player may well
 * know them; ★, ✓✓ and ✓ are this app's own, and seven tiers is more than
 * anyone should be asked to infer.
 */
export default function QualityLegend() {
  return (
    <details className="group border-t border-ink/30">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 text-caption italic transition-colors hover:text-rubric [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-flex size-[1.2rem] shrink-0 items-center justify-center border border-ink font-semibold not-italic leading-none"
        >
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">–</span>
        </span>
        Que signifient les symboles ?
      </summary>
      <GradeKey className="pb-2.5" />
    </details>
  )
}
