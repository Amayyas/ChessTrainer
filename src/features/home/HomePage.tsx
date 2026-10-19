import { PageHeader } from '@/components/UI'
import BoxScore from '@/components/UI/BoxScore'
import DoubleRule from '@/components/UI/DoubleRule'
import Gauge from '@/components/UI/Gauge'
import ModeGrid from '@/features/home/ModeGrid'
import LevelBar from '@/features/progression/LevelBar'
import { challengeProgress } from '@/features/progression/challenges'
import { levelFromXp } from '@/features/progression/levels'
import { useProgressionStore } from '@/store/useProgressionStore'
import { formatPercent } from '@/utils/format'

/**
 * Dashboard: progression, the day's challenges, recent activity, and a way
 * into each mode — set as a paper's results page: the figures as a box score,
 * the day's business in a ruled column beside them.
 */
const ACTIVITY_GLYPHS: Record<string, string> = {
  battle: '♜',
  puzzle: '♝',
  hunt: '♟',
  coach: '♞',
}

const COLUMN_HEAD = 'mb-3 text-kicker font-semibold uppercase'

export default function HomePage() {
  const xp = useProgressionStore((state) => state.xp)
  const stats = useProgressionStore((state) => state.stats)
  const daily = useProgressionStore((state) => state.daily)
  const activities = useProgressionStore((state) => state.activities)

  const progress = levelFromXp(xp)
  const challenges = challengeProgress(daily)
  const figures = [
    { label: 'Parties jouées', value: stats.gamesPlayed },
    { label: 'Puzzles résolus', value: stats.puzzlesSolved },
    {
      label: 'Précision moyenne',
      value: stats.battleAccuracy === null ? '—' : formatPercent(stats.battleAccuracy),
    },
    { label: 'Record Chasse', value: stats.bestHuntScore },
  ]

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Votre progression, les défis du jour et vos dernières parties."
      />

      <div className="grid grid-cols-1 gap-y-12 pb-14 sm:pb-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-labelledby="t-progression" className="lg:pr-14">
          <h2 id="t-progression" className={COLUMN_HEAD}>
            Progression
          </h2>
          <LevelBar progress={progress} />
          <p className="mt-2 text-caption italic text-ink-soft">{xp} XP au total</p>

          <BoxScore figures={figures} columns={4} size="title" rule="ink" className="mt-9" />
        </section>

        <div className="flex flex-col gap-10 lg:border-l lg:border-ink/30 lg:pl-11">
          <section aria-labelledby="t-defis">
            <h2 id="t-defis" className={COLUMN_HEAD}>
              Défis du jour
            </h2>
            <ul>
              {challenges.map(({ challenge, progress: done, isComplete }) => (
                <li
                  key={challenge.id}
                  className="border-t border-ink/30 py-3 first:border-t-0 first:pt-0"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className={isComplete ? 'text-ink-soft line-through' : undefined}>
                      {challenge.label}
                    </span>
                    <span className="shrink-0 text-caption tabular-nums lining-nums text-ink-soft">
                      {done} / {challenge.target}
                    </span>
                  </div>
                  <Gauge value={done / challenge.target} label={challenge.label} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="t-activites">
            <h2 id="t-activites" className={COLUMN_HEAD}>
              Activités récentes
            </h2>
            {activities.length === 0 ? (
              <p className="text-caption italic text-ink-soft">
                Rien pour l&apos;instant — lancez un mode et vos progrès s&apos;afficheront ici.
              </p>
            ) : (
              <ul>
                {activities.slice(0, 5).map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-baseline justify-between gap-3 border-t border-ink/30 py-2 first:border-t-0 first:pt-0"
                  >
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <span aria-hidden="true" className="font-figurine">
                        {ACTIVITY_GLYPHS[activity.kind]}
                      </span>
                      <span className="truncate">{activity.label}</span>
                    </span>
                    <span className="shrink-0 text-caption font-semibold tabular-nums lining-nums">
                      +{activity.xp} XP
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="t-modes" className="pb-2">
        <DoubleRule />
        <h2 id="t-modes" className="pt-4 text-title font-semibold sm:pt-[22px]">
          Choisissez un mode
        </h2>
        <ModeGrid />
      </section>
    </div>
  )
}
