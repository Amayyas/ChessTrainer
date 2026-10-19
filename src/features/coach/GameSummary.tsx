import { Box, Tag } from '@/components/UI'
import Notation from '@/components/UI/Notation'
import type { GameSummary as GameSummaryData } from '@/features/coach/useCoachAnalysis'
import { MOVE_QUALITY, type MoveQuality } from '@/utils/evaluation'
import { formatPercent } from '@/utils/format'

interface GameSummaryProps {
  summary: GameSummaryData
  /** Final status line, e.g. "Échec et mat — les blancs gagnent". */
  statusLabel: string
}

/** One side's accuracy, as a box score sets a figure: the number over its name. */
function AccuracyStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col-reverse justify-end py-3 even:border-l even:border-ink/30 even:pl-4">
      <dt className="text-caption text-ink-soft">{label}</dt>
      <dd className="text-title font-semibold tabular-nums lining-nums">
        {value === null ? '—' : formatPercent(value)}
      </dd>
    </div>
  )
}

/**
 * The tier's name as a counted noun: singular up to one, as French wants, and
 * lowered because the badge reads as a fragment while the table capitalises for
 * the legend. Both forms come from MOVE_QUALITY, so renaming a tier renames it
 * here and a test fails if anyone writes the word back in by hand.
 */
function countedNoun(meta: { label: string; plural: string }, count: number): string {
  return (count > 1 ? meta.plural : meta.label).toLowerCase()
}

/** End-of-game report: accuracy, mistake counts, best move. */
export default function GameSummary({ summary, statusLabel }: GameSummaryProps) {
  // The three tiers the summary counts, worst last. Not derived from
  // MOVE_QUALITY_ORDER: the approving tiers are not worth counting, and which
  // ones are is an editorial choice rather than a property of the table.
  const counted: { quality: MoveQuality; count: number }[] = [
    { quality: 'inaccuracy', count: summary.inaccuracies },
    { quality: 'mistake', count: summary.mistakes },
    { quality: 'blunder', count: summary.blunders },
  ]

  return (
    <Box className="flex flex-col gap-4">
      <div>
        <h2 className="text-kicker font-semibold uppercase">Résumé de la partie</h2>
        <p className="mt-1 text-body italic">{statusLabel}</p>
      </div>

      <dl className="grid grid-cols-2 border-y border-ink/30">
        <AccuracyStat label="Précision blancs" value={summary.accuracyWhite} />
        <AccuracyStat label="Précision noirs" value={summary.accuracyBlack} />
      </dl>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {counted.map(({ quality, count }) => {
          const meta = MOVE_QUALITY[quality]
          return (
            <Tag key={quality} tone={quality !== 'inaccuracy' && count > 0 ? 'accent' : 'muted'}>
              {count} {countedNoun(meta, count)}
            </Tag>
          )
        })}
      </div>

      {summary.bestMove && (
        <p className="text-caption text-ink-soft">
          Meilleur coup de la partie :{' '}
          <span className="font-semibold text-ink">
            <Notation san={summary.bestMove.san} /> (
            {summary.bestMove.color === 'w' ? 'blancs' : 'noirs'})
          </span>
        </p>
      )}
    </Box>
  )
}
