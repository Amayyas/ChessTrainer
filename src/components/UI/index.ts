export { default as Badge, badgeVariants } from '@/components/UI/Badge'
export type { BadgeProps, BadgeVariant } from '@/components/UI/Badge'
export { default as Button, buttonVariants } from '@/components/UI/Button'
export type { ButtonProps, ButtonSize, ButtonVariant } from '@/components/UI/Button'
export { default as Aurora } from '@/components/UI/Aurora'
export type { AuroraProps } from '@/components/UI/Aurora'
export { default as Card, CardDescription, CardFooter, CardTitle } from '@/components/UI/Card'
export type { CardProps } from '@/components/UI/Card'
/**
 * Dialog and Modal are deliberately absent from this barrel. Import them from
 * '@/components/UI/Dialog' and '@/components/UI/Modal' directly.
 *
 * Radix ships no `sideEffects: false`, so Rollup will not drop an unused
 * re-export of it: listing Modal here put the whole dialog implementation —
 * react-remove-scroll, aria-hidden, the focus guards — into the entry chunk of
 * every page, for a component no page renders. It measured 21.7 kB gzipped,
 * against a 200 kB budget already at 162. Every other component in this file is
 * cheap enough that the convenience is worth it; this one is not.
 */
export { default as PageHeader } from '@/components/UI/PageHeader'
export { default as Spinner } from '@/components/UI/Spinner'
