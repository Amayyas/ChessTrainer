import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { UNDERLINED_ITEM, UNDERLINED_ROW } from '@/components/UI/underlined'
import { cn } from '@/utils/cn'

/**
 * Tabs, in the ARIA sense: a list of controls that each reveal a panel.
 *
 * Distinct from the toggle group beside it, which looks much the same and means
 * something else. A toggle group is a choice — a filter, a setting — and its
 * options do not own a region of the page. These do, and the difference is
 * carried in the markup: a tablist with aria-controls, and a panel labelled by
 * the tab that opened it. A screen reader announces "tab 2 of 2" and can jump
 * straight to the panel; before this, it met two pressed buttons and two
 * anonymous divs, one of them hidden.
 */
const Tabs = TabsPrimitive.Root

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List ref={ref} className={cn('flex', UNDERLINED_ROW, className)} {...props} />
  )
})

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        UNDERLINED_ITEM,
        'whitespace-nowrap',
        'data-[state=active]:font-semibold data-[state=active]:text-ink',
        'data-[state=active]:underline',
        className,
      )}
      {...props}
    />
  )
})

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn('outline-none', className)} {...props} />
})

export { Tabs, TabsContent, TabsList, TabsTrigger }
