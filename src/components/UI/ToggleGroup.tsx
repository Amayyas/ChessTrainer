import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react'
import { cn } from '@/utils/cn'

/**
 * A row of mutually exclusive choices — a filter or a setting, not a set of
 * tabs.
 *
 * It replaces two hand-written controls that were divs of buttons carrying
 * aria-pressed. A screen reader announced them correctly, which is why nothing
 * ever looked wrong, but they could not be driven: every option was its own tab
 * stop — thirteen of them on the battle setup card — and the arrow keys did
 * nothing at all. Radix gives the group one tab stop and walks the options with
 * the arrows.
 *
 * Three looks, because the app has three: `segmented` is a pill on a tinted
 * track, `plain` a grid of bordered cards, `tiles` a row of square glyphs. The
 * variant is set once on the group and reaches the items through context, which
 * is shadcn's own arrangement.
 *
 * Not everything with aria-pressed belongs here. A single two-state button —
 * the coach's "show the arrow" — is exactly what aria-pressed is for, and it
 * stays as it is. The pattern this replaces is the other one: aria-pressed used
 * to express a choice among several.
 */
const groupVariants = cva('', {
  variants: {
    variant: {
      segmented: 'inline-flex flex-wrap gap-1 rounded-lg bg-foreground/5 p-1',
      plain: 'grid gap-2',
      tiles: 'flex flex-wrap gap-1',
    },
  },
  defaultVariants: { variant: 'segmented' },
})

const itemVariants = cva('transition-colors disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      segmented: cn(
        'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground',
        'data-[state=on]:bg-card data-[state=on]:font-semibold',
        'data-[state=on]:text-foreground data-[state=on]:shadow-sm',
      ),
      plain: cn(
        'rounded-xl border border-foreground/15 px-3 py-2 text-left text-sm',
        'text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        'data-[state=on]:border-primary data-[state=on]:bg-primary/15',
        'data-[state=on]:font-semibold data-[state=on]:text-foreground',
      ),
      tiles: cn(
        'flex h-10 w-10 items-center justify-center rounded-lg text-xl',
        'bg-foreground/5 text-muted-foreground hover:text-foreground',
        'data-[state=on]:bg-primary/25 data-[state=on]:text-foreground',
      ),
    },
  },
  defaultVariants: { variant: 'segmented' },
})

type GroupVariant = NonNullable<VariantProps<typeof groupVariants>['variant']>

const ToggleGroupContext = createContext<GroupVariant>('segmented')

const ToggleGroup = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof groupVariants>
>(function ToggleGroup({ className, variant, children, ...props }, ref) {
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn(groupVariants({ variant }), className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={variant ?? 'segmented'}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
})

const ToggleGroupItem = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(function ToggleGroupItem({ className, ...props }, ref) {
  const variant = useContext(ToggleGroupContext)
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(itemVariants({ variant }), className)}
      {...props}
    />
  )
})

export { ToggleGroup, ToggleGroupItem }
