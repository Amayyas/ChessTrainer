import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Optional actions rendered on the right (buttons, filters). */
  actions?: ReactNode
  className?: string
}

/**
 * The heading every page opens with: the title, a standfirst under it, and a
 * rule that closes the head of the page the way a column's head is ruled off.
 *
 * The actions slot keeps a minimum height, the height of the tallest status
 * the pages set there: a spinner beside a line of text. A status changes form
 * as it goes — loading, then a tag, sometimes an alert — and on a narrow
 * screen, where the slot sits under the title, a slot sized by its content
 * moved everything below it each time, the board included.
 */
export default function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-8 flex flex-col gap-4 border-b border-ink pb-5',
        'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        <h1 className="text-title font-medium text-ink sm:text-headline">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-body text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex min-h-5 shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
