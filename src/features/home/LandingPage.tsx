import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge, Card } from '@/components/UI'
import { MODES } from '@/features/home/modes'
import { brand } from '@/lib/design-tokens'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { ROUTES } from '@/routes'

/**
 * The public front door on '/'.
 *
 * The dashboard used to sit here, so a visitor typing the domain met an empty
 * progress bar and four cards. This presents the product instead — what the
 * modes are, what the coach does — and leaves the dashboard to '/dashboard',
 * where someone who has an account goes.
 */
export default function LandingPage() {
  const reduceMotion = useReducedMotion()

  return (
    <div>
      <section className="mb-10 rounded-2xl bg-ebene px-6 py-12 text-ivoire sm:px-10 sm:py-16">
        <p className="mb-3 font-semibold uppercase tracking-[0.2em] text-or">{brand.fullName}</p>
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight sm:text-5xl">
          {brand.tagline}
        </h1>
        <p className="mt-5 max-w-xl text-ivoire/70">
          Analysez vos parties coup par coup avec Stockfish, affrontez une IA calibrée et entraînez
          votre tactique — sans créer de compte.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={ROUTES.coach}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-or px-6 text-sm font-semibold text-ebene shadow-gold transition-colors hover:bg-or-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2 focus-visible:ring-offset-ebene"
          >
            Essayer le coach
          </Link>
          <Link
            to={ROUTES.register}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-ivoire/25 px-6 text-sm font-semibold text-ivoire transition-colors hover:border-ivoire/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or focus-visible:ring-offset-2 focus-visible:ring-offset-ebene"
          >
            Créer un compte
          </Link>
        </div>
      </section>

      <h2 className="mb-4 font-display text-2xl font-bold text-ebene">Quatre façons de jouer</h2>

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
