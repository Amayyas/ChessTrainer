import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/**
 * A boxed aside: a one-pixel ink frame on bright paper, square and flat.
 *
 * It replaces the card, which floated white surfaces on soft shadows with a
 * 20 px corner. A newsprint page sets most of its structure in rules; a box is
 * for what sits beside the text — a form, a set of hints, a key of signs — and
 * it is drawn the way a column draws one, with a frame and no lift. Nothing
 * rises under the pointer either: a box that acts as a link says so with its
 * own hover, a colour change.
 */
const Box = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Box(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('border border-ink bg-paper-bright p-6 text-ink', className)}
      {...props}
    />
  )
})

export default Box
