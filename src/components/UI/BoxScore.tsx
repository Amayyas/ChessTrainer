import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface BoxScoreFigure {
  label: string
  value: ReactNode
  /** Needs attention now — the last seconds on a clock — and is set in the rubric. */
  urgent?: boolean
}

interface BoxScoreProps {
  figures: readonly BoxScoreFigure[]
  /** Figures to a row from 640 px: as many as there are figures, up to four, unless given. */
  columns?: 2 | 3 | 4
  /** Figures to a row on a phone. */
  phoneColumns?: 2 | 3
  /** `title` for a page's own figures, `heading` for a panel's. */
  size?: 'heading' | 'title'
  /** `ink` opens the score under an ink rule, as a page section does; `hairline` frames a panel's. */
  rule?: 'ink' | 'hairline'
  className?: string
}

/*
 * The rules between figures, by row length: a hairline before every figure
 * but a row's first, and above every row but the first. Tailwind only builds
 * classes it finds written out, so each row length has its own; the phone's
 * and the wider screens' are kept apart by `max-sm:` and `sm:`, which never
 * apply together, so neither set can override the other.
 */
const PHONE = {
  2: 'max-sm:[&:nth-child(2n)]:border-l max-sm:[&:nth-child(2n)]:pl-4 max-sm:[&:nth-child(n+3)]:border-t',
  3: 'max-sm:[&:not(:nth-child(3n+1))]:border-l max-sm:[&:not(:nth-child(3n+1))]:pl-4 max-sm:[&:nth-child(n+4)]:border-t',
} as const

const WIDE = {
  2: 'sm:[&:nth-child(2n)]:border-l sm:[&:nth-child(2n)]:pl-4 sm:[&:nth-child(n+3)]:border-t',
  3: 'sm:[&:not(:nth-child(3n+1))]:border-l sm:[&:not(:nth-child(3n+1))]:pl-4 sm:[&:nth-child(n+4)]:border-t',
  4: 'sm:[&:not(:nth-child(4n+1))]:border-l sm:[&:not(:nth-child(4n+1))]:pl-4 sm:[&:nth-child(n+5)]:border-t',
} as const

const GRID = {
  phone: { 2: 'max-sm:grid-cols-2', 3: 'max-sm:grid-cols-3' },
  wide: { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' },
} as const

/**
 * A box score, as a paper's results page sets one: each figure over its name,
 * the columns and rows ruled apart. The site's figures — the dashboard's and
 * the profile's, a round's in the Piece Hunt, a puzzle's, the coach's summary —
 * all come from here, so they cannot drift apart again: five hand-written
 * copies had each picked their own size, padding and way of drawing the rules.
 */
export default function BoxScore({
  figures,
  columns = Math.min(Math.max(figures.length, 2), 4) as 2 | 3 | 4,
  phoneColumns = 2,
  size = 'heading',
  rule = 'hairline',
  className,
}: BoxScoreProps) {
  return (
    <dl
      className={cn(
        'grid border-b border-t border-ink/30',
        rule === 'ink' && 'border-t-ink',
        GRID.phone[phoneColumns],
        GRID.wide[columns],
        className,
      )}
    >
      {figures.map((figure) => (
        <div
          key={figure.label}
          className={cn(
            'flex flex-col-reverse justify-end border-ink/30',
            size === 'title' ? 'py-4' : 'py-3',
            PHONE[phoneColumns],
            WIDE[columns],
          )}
        >
          <dt className="text-caption text-ink-soft">{figure.label}</dt>
          <dd
            className={cn(
              'font-semibold tabular-nums lining-nums',
              size === 'title' ? 'text-title' : 'text-heading',
              figure.urgent && 'text-rubric',
            )}
          >
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
