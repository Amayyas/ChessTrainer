import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge, Card } from '@/components/UI'
import type { BadgeVariant } from '@/components/UI'
import LevelBar from '@/features/progression/LevelBar'
import { challengeProgress } from '@/features/progression/challenges'
import { levelFromXp } from '@/features/progression/levels'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { ROUTES, type RoutePath } from '@/routes'
import { useProgressionStore } from '@/store/useProgressionStore'
import { brand } from '@/lib/design-tokens'

/**
 * Dashboard: progression, the day's challenges, recent
 * activity, and a way into each mode.
 */
interface ModeCard {
  to: RoutePath
  glyph: string
  title: string
  description: string
  badge: string
  badgeVariant: BadgeVariant
}

const MODES: ModeCard[] = [
  {
    to: ROUTES.coach,
    glyph: '♞',
    title: 'Coach IA',
    description: 'Analysez chaque coup avec Stockfish et progressez à votre rythme.',
    badge: 'Apprentissage',
    badgeVariant: 'gold',
  },
  {
    to: ROUTES.battle,
    glyph: '♜',
    title: 'Affrontement',
    description: "Défiez l'IA sur cinq niveaux, de 800 à 2200 Elo.",
    badge: '5 niveaux',
    badgeVariant: 'neutral',
  },
  {
    to: ROUTES.puzzle,
    glyph: '♝',
    title: 'Puzzles',
    description: 'Résolvez des positions tactiques classées par thème.',
    badge: 'Tactique',
    badgeVariant: 'neutral',
  },
  {
    to: ROUTES.hunt,
    glyph: '♟',
    title: 'Chasse aux Pièces',
    description: 'Capturez un maximum de pièces en 60 secondes.',
    badge: 'Arcade',
    badgeVariant: 'gold',
  },
]

const ACTIVITY_GLYPHS: Record<string, string> = {
  battle: '♜',
  puzzle: '♝',
  hunt: '♟',
  coach: '♞',
}

export default function HomePage() {
  const reduceMotion = useReducedMotion()
  const xp = useProgressionStore((state) => state.xp)
  const stats = useProgressionStore((state) => state.stats)
  const daily = useProgressionStore((state) => state.daily)
  const activities = useProgressionStore((state) => state.activities)

  const progress = levelFromXp(xp)
  const challenges = challengeProgress(daily)

  return (
    <div>
      <section className="mb-8 rounded-2xl bg-ebene px-6 py-8 text-ivoire sm:px-10 sm:py-10">
        <p className="mb-2 font-semibold uppercase tracking-[0.2em] text-or">{brand.fullName}</p>
        <h1 className="max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">
          Apprenez les échecs avec un coach intelligent
        </h1>
        <div className="mt-6 max-w-md">
          <LevelBar progress={progress} onDark />
          <p className="mt-2 text-sm text-ivoire/70">{xp} XP au total</p>
        </div>
      </section>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold text-ebene">Challenges du jour</h2>
          <ul className="space-y-3">
            {challenges.map(({ challenge, progress: done, isComplete }) => (
              <li key={challenge.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className={isComplete ? 'text-ardoise line-through' : 'text-ebene'}>
                    {challenge.label}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ardoise">
                    {done} / {challenge.target}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ebene/10">
                  <div
                    className={isComplete ? 'h-full bg-emerald-500' : 'h-full bg-or'}
                    style={{ width: `${Math.round((done / challenge.target) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-bold text-ebene">Activités récentes</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-ardoise">
              Rien pour l'instant — lancez un mode et vos progrès s'afficheront ici.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activities.slice(0, 5).map((activity) => (
                <li key={activity.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="text-base text-or">
                      {ACTIVITY_GLYPHS[activity.kind]}
                    </span>
                    <span className="truncate text-ebene">{activity.label}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-ardoise">
                    +{activity.xp} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Parties jouées', value: stats.gamesPlayed },
          { label: 'Puzzles résolus', value: stats.puzzlesSolved },
          {
            label: 'Précision moyenne',
            value: stats.averageAccuracy === null ? '—' : `${stats.averageAccuracy}%`,
          },
          { label: 'Record Chasse', value: stats.bestHuntScore },
        ].map((stat) => (
          <Card key={stat.label} className="px-4 py-3 text-center">
            <p className="font-display text-2xl font-bold text-ebene">{stat.value}</p>
            <p className="text-xs text-ardoise">{stat.label}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 font-display text-2xl font-bold text-ebene">Choisissez un mode</h2>

      <motion.div
        className="grid gap-4 sm:grid-cols-2"
        variants={reduceMotion ? undefined : staggerContainer}
        initial="initial"
        animate="animate"
      >
        {MODES.map((mode) => (
          <motion.div key={mode.to} variants={reduceMotion ? undefined : staggerItem}>
            <Link
              to={mode.to}
              className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2 focus-visible:ring-offset-ivoire"
            >
              <Card interactive className="flex h-full items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ebene text-3xl text-or"
                >
                  {mode.glyph}
                </span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-bold text-ebene">{mode.title}</h3>
                    <Badge variant={mode.badgeVariant}>{mode.badge}</Badge>
                  </div>
                  <p className="text-sm text-ardoise">{mode.description}</p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
