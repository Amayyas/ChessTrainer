import { Box, Tag } from '@/components/UI'
import BoxScore from '@/components/UI/BoxScore'
import Notation from '@/components/UI/Notation'
import type { GameSummary as GameSummaryData } from '@/features/coach/useCoachAnalysis'
import { MOVE_QUALITY, type MoveQuality } from '@/utils/evaluation'
import { formatPercent } from '@/utils/format'

interface GameSummaryProps {
  summary: GameSummaryData
  /** Final status line, e.g. "Échec et mat — les blancs gagnent". */
  statusLabel: string
}

/** One side's accuracy, or a dash while there is none. */
function accuracy(value: number | null): string {
  return value === null ? '—' : formatPercent(value)
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

      <BoxScore
        columns={2}
        size="title"
        figures={[
          { label: 'Précision blancs', value: accuracy(summary.accuracyWhite) },
          { label: 'Précision noirs', value: accuracy(summary.accuracyBlack) },
        ]}
      />

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
