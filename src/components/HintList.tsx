import Notation from '@/components/UI/Notation'

/**
 * A hint is a sentence, or a sentence that ends on a move. The move is kept
 * apart from the words so it can be set in figurines like every other move,
 * rather than in the English letters chess.js writes.
 */
export type Hint = string | { lead: string; san: string }

/**
 * The hints revealed so far, numbered in the rubric: they are the coach
 * speaking, which is one of the few things the rubric marks.
 */
export default function HintList({ hints }: { hints: Hint[] }) {
  return (
    <ol className="space-y-1">
      {hints.map((hint, index) => (
        <li key={index} className="grid grid-cols-[1.5rem_minmax(0,1fr)] text-caption">
          <span className="font-bold tabular-nums lining-nums text-rubric">{index + 1}.</span>
          <span>
            {typeof hint === 'string' ? (
              hint
            ) : (
              <>
                {hint.lead} <Notation san={hint.san} />.
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}
