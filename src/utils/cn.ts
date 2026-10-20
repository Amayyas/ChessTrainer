import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { typeScale } from '@/lib/design-tokens'

export type { ClassValue }

/**
 * tailwind-merge, told about the type scale. It recognises Tailwind's own sizes
 * (`text-sm`, `text-lg`) and reads any other `text-*` as a colour, so without
 * this `cn('text-body text-ink')` kept only the ink and dropped the size, with
 * no warning.
 *
 * Its major follows Tailwind's: version 2 knows Tailwind 3, which this project
 * runs, and version 3 knows Tailwind 4 alone. The two disagree in silence.
 * Under 3, `outline` is a width, as Tailwind 4 has it, so `outline
 * outline-[3px]` came out as the width without the style — and under Tailwind 3
 * an outline with no style is not drawn at all.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: Object.keys(typeScale) }] } },
})

/**
 * Class-name joiner: clsx to flatten the conditionals, tailwind-merge to settle
 * the conflicts.
 *
 * The components carry their variants in a class string and let the caller
 * override any of it through `className`, which only works if the later class
 * actually wins. Joined by hand, `cn('bg-ink', 'bg-rubric')` yields both and
 * the winner is whichever CSS rule Tailwind happened to emit last — the
 * override silently does nothing. twMerge drops the loser instead.
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(values))
}
