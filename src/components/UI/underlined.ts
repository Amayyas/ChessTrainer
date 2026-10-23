import { cn } from '@/utils/cn'

/**
 * The underlined row the tabs and the segmented toggle group share: words on a
 * hairline, the chosen one in semibold and underlined in the rubric.
 *
 * The underline is the word's own, not a border laid on the row's rule. A row
 * of filters wraps on a phone, and a border at the foot of its first line hung
 * in mid-air, 47 px above the only rule; an underline stays under its word on
 * any line.
 *
 * The two differ only in how Radix marks the chosen one — `data-state="active"`
 * on a tab, `"on"` on a toggle — and Tailwind generates a class only from its
 * full name written out in the source, so each file spells its own chosen
 * state and the rest lives here, to be restyled once.
 */
export const UNDERLINED_ROW = 'flex-wrap items-end gap-x-6 gap-y-1 border-b border-ink/30'

export const UNDERLINED_ITEM = cn(
  'inline-flex min-h-11 items-end px-0.5 pb-2',
  'text-body text-ink-soft transition-colors hover:text-ink',
  'decoration-rubric decoration-2 underline-offset-[6px]',
  'disabled:pointer-events-none disabled:opacity-50',
)
