import { Badge, Card, PageHeader } from '@/components/UI'
import LevelBar from '@/features/progression/LevelBar'
import { BADGES } from '@/features/progression/badges'
import { levelFromXp } from '@/features/progression/levels'
import { useProgressionStore } from '@/store/useProgressionStore'
import { cn } from '@/utils/cn'

/**
 * Profile (spec section 2.5): level, global statistics and the badge
 * collection. The account details of section 2.6 — pseudonym, avatar, sign-up
 * date — arrive with authentication in M10.
 */
export default function ProfilePage() {
  const xp = useProgressionStore((state) => state.xp)
  const stats = useProgressionStore((state) => state.stats)
  const unlocked = useProgressionStore((state) => state.unlockedBadges)

  const progress = levelFromXp(xp)
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : null

  const figures = [
    { label: 'Parties jouées', value: String(stats.gamesPlayed) },
    { label: 'Victoires', value: winRate === null ? '—' : `${stats.gamesWon} (${winRate}%)` },
    {
      label: 'Précision moyenne',
      value: stats.averageAccuracy === null ? '—' : `${stats.averageAccuracy}%`,
    },
    { label: 'Puzzles résolus', value: String(stats.puzzlesSolved) },
    { label: 'Meilleure série', value: `${stats.bestPuzzleStreak} j` },
    { label: 'Record Chasse', value: String(stats.bestHuntScore) },
  ]

  return (
    <div>
      <PageHeader
        title="Profil"
        subtitle="Votre progression, vos statistiques et vos badges."
        actions={<Badge variant="gold">Niveau {progress.level}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <LevelBar progress={progress} />
            <p className="mt-2 text-sm text-ardoise">{xp} XP au total</p>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-bold text-ebene">Statistiques</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {figures.map((figure) => (
                <div key={figure.label} className="rounded-xl bg-ebene/5 px-3 py-2 text-center">
                  <dd className="font-display text-xl font-bold text-ebene">{figure.value}</dd>
                  <dt className="text-xs text-ardoise">{figure.label}</dt>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-1 font-display text-lg font-bold text-ebene">Badges</h2>
          <p className="mb-3 text-xs text-ardoise">
            {unlocked.length} sur {BADGES.length} débloqués
          </p>
          <ul className="space-y-2">
            {BADGES.map((badge) => {
              const isUnlocked = unlocked.includes(badge.id)
              return (
                <li
                  key={badge.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl px-3 py-2',
                    isUnlocked ? 'bg-or/15' : 'bg-ebene/5',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('text-xl leading-none', !isUnlocked && 'opacity-30 grayscale')}
                  >
                    {badge.glyph}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-sm font-semibold',
                        isUnlocked ? 'text-ebene' : 'text-ardoise',
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="block text-xs text-ardoise">{badge.description}</span>
                  </span>
                  <span className="sr-only">{isUnlocked ? 'Débloqué' : 'Verrouillé'}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
