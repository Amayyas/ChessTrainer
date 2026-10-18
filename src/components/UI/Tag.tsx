import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/**
 * A label in tracked capitals: a category, a status, a difficulty.
 *
 * The newsprint page has no pills. A tag is a word set like a column's kicker
 * and coloured by what it says: `muted` for a plain fact, `ink` for a result,
 * good or bad, `accent` in the rubric for what went wrong — a mistake, a
 * falling trend — and `alert`, the rubric as a solid block, for what needs
 * acting on now. The rubric marks nothing else: a category or a piece of good
 * news is never red. Alert differs from accent in form as well as in colour,
 * so the two never rely on colour alone. Its block bleeds into its margin
 * instead of adding to its height, so a status that turns into an alert moves
 * nothing around it.
 *
 * It stays a <span>: tags sit inside sentences and beside headings, where a
 * block element is invalid. The tone is also written to `data-tone`, so a test
 * asks what a tag says rather than which classes it carries.
 */
const TONES = {
  muted: 'text-ink-soft',
  ink: 'text-ink',
  accent: 'text-rubric',
  alert: 'bg-rubric px-1.5 py-1 -my-1 text-paper-bright',
} as const

export type TagTone = keyof typeof TONES

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone
}

export default function Tag({ tone = 'muted', className, ...props }: TagProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1 text-kicker font-semibold uppercase leading-none',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
