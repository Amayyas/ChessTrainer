import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Optional actions rendered on the right (buttons, filters). */
  actions?: ReactNode
  className?: string
}

/** Consistent page heading used across the app (spec section M2). */
export default function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        <h1 className="font-display text-3xl font-bold text-ebene sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ardoise">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
