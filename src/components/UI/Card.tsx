import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift. Use for cards that act as links or buttons. */
  interactive?: boolean
}

/**
 * Surface container of the design system. White surface on the ivory page
 * background, soft elevation. When interactive, it lifts on hover.
 *
 * The lift was a Framer Motion `whileHover`; it is now a CSS transform of the
 * same 4px. Seventeen pages render this component, so that removed seventeen
 * animation runtimes from the tree in exchange for one class.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-card p-6 text-card-foreground shadow-card',
        interactive &&
          cn(
            'cursor-pointer transition-[box-shadow,transform]',
            'hover:-translate-y-1 hover:shadow-card-hover',
            'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          ),
        className,
      )}
      {...props}
    />
  )
})

/**
 * The parts, for the pages that were repeating the same heading classes inside
 * a card. Unlike shadcn's, none of them carries padding: the card above already
 * owns it, and a CardContent with its own `p-6` inside a `p-6` card would
 * double the inset everywhere it appeared.
 */
const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h2
        ref={ref}
        className={cn('font-display text-lg font-bold text-foreground', className)}
        {...props}
      />
    )
  },
)

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  },
)

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
})

export default Card
export { CardDescription, CardFooter, CardTitle }
