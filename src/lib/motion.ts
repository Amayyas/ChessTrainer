import type { Transition, Variants } from 'framer-motion'

/**
 * Shared Framer Motion presets so animations feel consistent across the app
 * (immediate feedback, and animations that stay fluid).
 *
 * Every consumer must gate these behind `useReducedMotion()` and fall back to
 * no movement when the user asked for reduced motion.
 */

export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1]

export const pageTransition: Transition = {
  duration: 0.28,
  ease: easeOut,
}

/** Fade + small upward slide, used for route transitions. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/** Container that reveals its children one after another. */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
}

/** Individual item revealed by {@link staggerContainer}. */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: pageTransition },
}
