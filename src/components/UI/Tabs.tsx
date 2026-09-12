import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
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
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-lg bg-foreground/5 p-1',
        className,
      )}
      {...props}
    />
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
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1',
        'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
        'data-[state=active]:bg-card data-[state=active]:font-semibold',
        'data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        'disabled:pointer-events-none disabled:opacity-50',
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
