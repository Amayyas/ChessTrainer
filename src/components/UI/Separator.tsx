import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/utils/cn'

/**
 * A rule between two groups.
 *
 * It is a Radix primitive rather than a bare div for the one thing a div gets
 * wrong: `decorative` decides whether the line is announced as a separator or
 * hidden from the accessibility tree, and the default here is decorative,
 * because most rules are drawing rather than structure.
 */
const Separator = forwardRef<
  ElementRef<typeof SeparatorPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(function Separator({ className, orientation = 'horizontal', decorative = true, ...props }, ref) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
})

export default Separator
