import { Badge, Card } from '@/components/UI'
import type { GameSummary as GameSummaryData } from '@/features/coach/useCoachAnalysis'
import { MOVE_QUALITY, type MoveQuality } from '@/utils/evaluation'

interface GameSummaryProps {
  summary: GameSummaryData
  /** Final status line, e.g. "Échec et mat — les blancs gagnent". */
  statusLabel: string
}

function AccuracyStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-ebene/5 px-3 py-2 text-center">
      <p className="font-display text-2xl font-bold text-ebene">
        {value === null ? '—' : `${value}%`}
      </p>
      <p className="text-xs text-ardoise">{label}</p>
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
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ebene">Résumé de la partie</h2>
        <p className="mt-1 text-sm text-ardoise">{statusLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AccuracyStat label="Précision blancs" value={summary.accuracyWhite} />
        <AccuracyStat label="Précision noirs" value={summary.accuracyBlack} />
      </div>

      <div className="flex flex-wrap gap-2">
        {counted.map(({ quality, count }) => {
          const meta = MOVE_QUALITY[quality]
          return (
            <Badge
              key={quality}
              variant={quality !== 'inaccuracy' && count > 0 ? 'danger' : 'neutral'}
            >
              {count} {countedNoun(meta, count)}
            </Badge>
          )
        })}
      </div>

      {summary.bestMove && (
        <p className="text-sm text-ardoise">
          Meilleur coup de la partie :{' '}
          <span className="font-semibold text-ebene">
            {summary.bestMove.san} ({summary.bestMove.color === 'w' ? 'blancs' : 'noirs'})
          </span>
        </p>
      )}
    </Card>
  )
}
