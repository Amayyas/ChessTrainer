import { useState } from 'react'
import { PageHeader, Spinner, Tag } from '@/components/UI'
import Alert from '@/components/UI/Alert'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
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
    <ToggleGroup
      type="single"
      value={value}
      // Radix lets a single-value group be emptied by pressing the option that
      // is already on. A filter has no empty state — there is no "no period" —
      // so the deselection is dropped rather than passed on.
      onValueChange={(next) => {
        if (next) onChange(next as T)
      }}
      aria-label={label}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/**
 * Worldwide Piece Hunt leaderboard: top ten per piece or
 * overall, filtered by period, refreshed live, with the signed-in player
 * highlighted.
 *
 * Set as a paper's results table: ruled rows, the rank and the score in
 * figures, the player's own row on the deep paper tint, the one place a rule
 * alone would not set it apart.
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
        actions={<Tag>Temps réel</Tag>}
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <Segmented options={PIECES} value={piece} onChange={setPiece} label="Filtrer par pièce" />
          <Segmented
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            label="Filtrer par période"
          />
        </div>

        {error && <Alert>{error}</Alert>}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Chargement du classement" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center italic text-ink-soft">
            Aucun score sur cette période. Lancez une manche de Chasse pour ouvrir le classement.
          </p>
        ) : (
          <ol className="border-y border-ink">
            {rows.map((row, index) => {
              const isMe = session?.user.id === row.userId
              return (
                <li
                  key={row.id}
                  className={cn(
                    'flex items-center gap-3.5 border-t border-ink/30 px-1 py-2.5 first:border-t-0',
                    isMe && 'bg-paper-deep',
                  )}
                >
                  <span className="w-8 shrink-0 text-right text-heading font-bold tabular-nums lining-nums">
                    {index + 1}.
                  </span>
                  <span
                    aria-hidden="true"
                    className="w-7 text-center font-figurine text-[1.25rem] leading-7"
                  >
                    {AVATAR_GLYPHS[row.avatarPiece as AvatarPiece] ?? '♟'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2.5">
                      <span className="truncate font-semibold">{row.username}</span>
                      {isMe && <Tag tone="ink">vous</Tag>}
                    </span>
                    <span className="block text-caption italic text-ink-soft">
                      {CHAMPION_LABELS[row.piece as ChampionType] ?? row.piece} · {row.captures}{' '}
                      captures · {new Date(row.playedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                  <span className="shrink-0 text-title font-semibold tabular-nums lining-nums">
                    {row.score}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
