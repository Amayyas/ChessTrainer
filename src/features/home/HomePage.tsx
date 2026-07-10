import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge, Card } from '@/components/UI'
import type { BadgeVariant } from '@/components/UI'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { ROUTES, type RoutePath } from '@/routes'

/**
 * Landing / dashboard. This M2 version showcases the design system and links to
 * every mode. The rich dashboard content — daily challenges, quick stats — is
 * added in M8 (progression system), per the specification.
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

export default function HomePage() {
  const reduceMotion = useReducedMotion()

  return (
    <div>
      <section className="mb-10 rounded-2xl bg-ebene px-6 py-10 text-ivoire sm:px-10 sm:py-14">
        <p className="mb-3 font-semibold uppercase tracking-[0.2em] text-or">ChessTrainer AI</p>
        <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
          Apprenez les échecs avec un coach intelligent
        </h1>
        <p className="mt-4 max-w-xl text-ivoire/70">
          Quatre modes pour progresser : analyse assistée par IA, affrontement calibré, puzzles
          tactiques et un mode arcade pour maîtriser le déplacement des pièces.
        </p>
      </section>

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
