import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from '@/utils/cn'

/**
 * A row of mutually exclusive choices — a filter, not a set of tabs.
 *
 * It replaces a hand-written control that was a div of buttons carrying
 * aria-pressed. That was announced correctly and could not be driven: every
 * option was its own tab stop, and the arrow keys did nothing. Radix gives the
 * group one tab stop and moves between the options with the arrow keys, which
 * is what the pattern is supposed to do.
 *
 * shadcn's version carries a variant and a size through a React context.
 * Neither is used here — the app has exactly one segmented control — so the
 * context is gone and the classes sit on the item directly.
 */
const ToggleGroup = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(function ToggleGroup({ className, ...props }, ref) {
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn('inline-flex flex-wrap gap-1 rounded-lg bg-foreground/5 p-1', className)}
      {...props}
    />
  )
})

const ToggleGroupItem = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(function ToggleGroupItem({ className, ...props }, ref) {
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        'rounded-md px-3 py-1 text-sm transition-colors',
        'font-medium text-muted-foreground hover:text-foreground',
        'data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground',
        'data-[state=on]:shadow-sm',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})

export { ToggleGroup, ToggleGroupItem }
