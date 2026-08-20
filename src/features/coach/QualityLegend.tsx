import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'

/**
 * What the marks beside each move mean.
 *
 * `!`, `?!`, `?` and `??` are standard chess annotation and a player may well
 * know them; `!!`, `✓✓` and `✓` are this app's own, and seven tiers is more
 * than anyone should be asked to infer from colour alone.
 */
export default function QualityLegend() {
  return (
    <details className="rounded-xl bg-ebene/5 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-ardoise">
        Que signifient les symboles ?
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {MOVE_QUALITY_ORDER.map((quality) => {
          const meta = MOVE_QUALITY[quality]
          return (
            <li key={quality} className="flex items-baseline gap-2 text-xs">
              {/* Fixed width so the labels line up whatever the symbol. */}
              <span className={`w-6 shrink-0 font-bold ${meta.color}`}>{meta.symbol}</span>
              <span className="text-ardoise">{meta.label}</span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
