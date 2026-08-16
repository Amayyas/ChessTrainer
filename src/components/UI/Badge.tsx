import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeVariant = 'neutral' | 'gold' | 'success' | 'danger'

const VARIANTS: Record<BadgeVariant, string> = {
  // Gold badges use a gold background with ebony text: gold text on a light
  // surface only reaches 2.3:1, which fails WCAG AA.
  neutral: 'bg-ebene/5 text-ardoise',
  gold: 'bg-or text-ebene',
  success: 'bg-emerald-600 text-white',
  danger: 'bg-red-600 text-white',
}

export interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

/** Small pill used for categories, difficulty and achievements. */
export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
