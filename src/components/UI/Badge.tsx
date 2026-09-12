import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/**
 * Small pill used for categories, difficulty and achievements.
 *
 * shadcn's badge renders a <div> and squares its corners. This one stays a
 * <span> with a full radius: badges here sit inside sentences and beside
 * headings, where a block element is invalid and a rectangle reads as a button.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        neutral: 'bg-foreground/5 text-muted-foreground',
        // Gold badges use a gold background with ebony text: gold text on a
        // light surface only reaches 2.3:1, which fails WCAG AA.
        gold: 'bg-primary text-primary-foreground',
        // Green is the one colour with no token: the palette has an identity,
        // a danger and nothing that means "achieved".
        success: 'bg-emerald-600 text-white',
        danger: 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export default function Badge({ variant, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
