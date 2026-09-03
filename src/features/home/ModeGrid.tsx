import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge, Card } from '@/components/UI'
import { MODES } from '@/features/home/modes'
import { staggerContainer, staggerItem } from '@/lib/motion'

/**
 * The four mode cards, as a link grid.
 *
 * Rendered on both the dashboard and the public landing. The data lives in
 * modes.ts; this is the markup, kept in one place for the same reason — a change
 * to how a card looks should not have to be made twice.
 */
export default function ModeGrid() {
  const reduceMotion = useReducedMotion()

  return (
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
  )
}
