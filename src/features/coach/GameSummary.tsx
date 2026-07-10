import { Badge, Card } from '@/components/UI'
import type { GameSummary as GameSummaryData } from '@/features/coach/useCoachAnalysis'

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

/** End-of-game report (spec section 2.1): accuracy, mistake counts, best move. */
export default function GameSummary({ summary, statusLabel }: GameSummaryProps) {
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
        <Badge variant="neutral">{summary.inaccuracies} imprécisions</Badge>
        <Badge variant={summary.mistakes > 0 ? 'danger' : 'neutral'}>
          {summary.mistakes} erreurs
        </Badge>
        <Badge variant={summary.blunders > 0 ? 'danger' : 'neutral'}>
          {summary.blunders} gaffes
        </Badge>
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
