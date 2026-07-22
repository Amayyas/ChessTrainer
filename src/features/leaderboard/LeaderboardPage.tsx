import { useState } from 'react'
import { Badge, Card, PageHeader, Spinner } from '@/components/UI'
import { CHAMPION_LABELS, type ChampionType } from '@/features/hunt/board'
import {
  useLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardPiece,
} from '@/features/leaderboard/useLeaderboard'
import { AVATAR_GLYPHS, type AvatarPiece } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/utils/cn'

const PIECES: { value: LeaderboardPiece; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  ...(['q', 'r', 'b', 'n'] as ChampionType[]).map((piece) => ({
    value: piece as LeaderboardPiece,
    label: CHAMPION_LABELS[piece],
  })),
]

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'all', label: 'Tous les temps' },
]

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-lg bg-ebene/5 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded-md px-3 py-1 text-sm transition-colors',
            value === option.value
              ? 'bg-white font-semibold text-ebene shadow-sm'
              : 'font-medium text-ardoise hover:text-ebene',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Worldwide Piece Hunt leaderboard (spec section 2.6): top ten per piece or
 * overall, filtered by period, refreshed live, with the signed-in player
 * highlighted.
 */
export default function LeaderboardPage() {
  const [piece, setPiece] = useState<LeaderboardPiece>('all')
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const { rows, isLoading, error } = useLeaderboard(piece, period)
  const session = useAuthStore((state) => state.session)

  return (
    <div>
      <PageHeader
        title="Classement mondial"
        subtitle="Les meilleurs scores de la Chasse aux Pièces, mis à jour en direct."
        actions={<Badge variant="gold">Temps réel</Badge>}
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented options={PIECES} value={piece} onChange={setPiece} label="Filtrer par pièce" />
          <Segmented
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            label="Filtrer par période"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Chargement du classement" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ardoise">
            Aucun score sur cette période. Lancez une manche de Chasse pour ouvrir le classement.
          </p>
        ) : (
          <ol className="divide-y divide-ebene/10">
            {rows.map((row, index) => {
              const isMe = session?.user.id === row.userId
              return (
                <li
                  key={row.id}
                  className={cn(
                    'flex items-center gap-3 py-2.5',
                    isMe && 'rounded-lg bg-or/15 px-2',
                  )}
                >
                  <span
                    className={cn(
                      'w-7 shrink-0 text-center font-display text-lg font-bold',
                      index === 0 ? 'text-or' : 'text-ardoise',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span aria-hidden="true" className="text-xl text-ebene">
                    {AVATAR_GLYPHS[row.avatarPiece as AvatarPiece] ?? '♟'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ebene">
                      {row.username}
                      {isMe && <span className="ml-2 text-xs font-normal text-or">vous</span>}
                    </span>
                    <span className="block text-xs text-ardoise">
                      {CHAMPION_LABELS[row.piece as ChampionType] ?? row.piece} · {row.captures}{' '}
                      captures · {new Date(row.playedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-xl font-bold tabular-nums text-ebene">
                    {row.score}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </div>
  )
}
