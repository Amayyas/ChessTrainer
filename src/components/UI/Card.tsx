import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> {
  /** Adds a hover lift. Use for cards that act as links or buttons. */
  interactive?: boolean
  children?: ReactNode
}

/**
 * Surface container of the design system (spec section M2). White surface on the
 * ivory page background, soft elevation. When interactive, it lifts on hover.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className, children, ...props },
  ref,
) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      whileHover={interactive && !reduceMotion ? { y: -4 } : undefined}
      className={cn(
        'rounded-2xl bg-white p-6 shadow-card',
        interactive && 'cursor-pointer transition-shadow hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
})

export default Card
