import { Badge, Card } from '@/components/UI'
import { recentTrend, type AccuracyEntry } from '@/features/progression/accuracyHistory'

const OUTCOME_LABEL: Record<AccuracyEntry['outcome'], string> = {
  win: 'Victoire',
  loss: 'Défaite',
  draw: 'Nulle',
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * The accuracy of each reviewed game, oldest on the left.
 *
 * Drawn by hand rather than with a charting library: this is one polyline over
 * a fixed scale, and the smallest library able to produce it weighs more than
 * the entire error-reporting SDK.
 */
function Sparkline({ entries }: { entries: readonly AccuracyEntry[] }) {
  // Oldest first, so the line reads left to right like the passage of time.
  const points = [...entries].reverse()
  const width = 100
  const height = 32

  // The scale is fixed to 0–100 rather than to the data. A run of scores between
  // 71 and 74 auto-scaled would look like wild swings; against the full range it
  // looks like what it is — a flat line.
  const path = points
    .map((entry, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = height - (entry.accuracy / 100) * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label={`Évolution de la précision sur les ${points.length} dernières parties analysées`}
    >
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="stroke-ebene/10" />
      <path
        d={path}
        fill="none"
        className="stroke-or"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default function AccuracyHistory({ entries }: { entries: readonly AccuracyEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <h2 className="mb-2 font-display text-lg font-bold text-ebene">Précision par partie</h2>
        <p className="text-sm text-ardoise">
          Jouez une partie en Affrontement, puis analysez-la dans le Coach : sa précision
          s'affichera ici, et vous pourrez suivre vos progrès d'une partie à l'autre.
        </p>
      </Card>
    )
  }

  const trend = recentTrend(entries)

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ebene">Précision par partie</h2>
        {trend !== null && (
          <Badge variant={trend.delta > 0 ? 'gold' : 'neutral'}>
            {trend.delta > 0 ? '+' : ''}
            {trend.delta} pts sur vos 5 dernières
          </Badge>
        )}
      </div>

      <Sparkline entries={entries} />

      <ul className="mt-3 divide-y divide-ebene/10">
        {entries.slice(0, 10).map((entry, index) => (
          // The timestamp alone is not unique: two games can land in the same
          // millisecond, and a hydrated row can carry a duplicate.
          <li
            key={`${entry.playedAt}-${index}`}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="text-ardoise">{dateFormat.format(new Date(entry.playedAt))}</span>
            <span className="min-w-0 flex-1 truncate text-ardoise">
              {entry.level} — {OUTCOME_LABEL[entry.outcome]}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ebene">
              {entry.accuracy}%
            </span>
          </li>
        ))}
      </ul>

      {entries.length > 10 && (
        <p className="mt-2 text-xs text-ardoise">
          Les 10 dernières parties sur {entries.length} enregistrées.
        </p>
      )}
    </Card>
  )
}
