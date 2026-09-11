import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type { ClassValue }

/**
 * Class-name joiner: clsx to flatten the conditionals, tailwind-merge to settle
 * the conflicts.
 *
 * It was a dependency-free `filter(Boolean).join(' ')` until the components
 * came from shadcn. Those carry their variants in a class string and let the
 * caller override any of it through `className`, which only works if the later
 * class actually wins. Joined by hand, `cn('bg-primary', 'bg-secondary')`
 * yields both and the winner is whichever CSS rule Tailwind happened to emit
 * last — the override silently does nothing. twMerge drops the loser instead.
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values))
}
