import { cn } from '@/utils/cn'

/**
 * The double rule that opens a section of the paper: three pixels of ink,
 * three of paper, one of ink. It sits under the masthead, above each section
 * of the landing and above the footer. Decoration, so hidden from assistive
 * tech: the headings it opens carry the structure.
 */
export default function DoubleRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-[7px] border-b border-t-[3px] border-ink', className)}
    />
  )
}
