import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react'
import { UNDERLINED_ITEM, UNDERLINED_ROW } from '@/components/UI/underlined'
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
 * Three looks, because the app has three: `segmented` is a row of words with
 * the chosen one underlined in the rubric, `plain` a grid of framed choices,
 * `tiles` a row of square glyphs. The chosen choice and the chosen tile are set
 * in reverse, paper on ink, which reads at a glance and does not rest on colour.
 * The variant is set once on the group and reaches the items through context.
 *
 * Not everything with aria-pressed belongs here. A single two-state button —
 * the coach's "show the arrow" — is exactly what aria-pressed is for, and it
 * stays as it is. The pattern this replaces is the other one: aria-pressed used
 * to express a choice among several.
 */
const GROUP = {
  segmented: cn('inline-flex', UNDERLINED_ROW),
  plain: 'grid gap-2',
  tiles: 'flex flex-wrap gap-1',
} as const

const ITEM = {
  segmented: cn(
    UNDERLINED_ITEM,
    'data-[state=on]:font-semibold data-[state=on]:text-ink data-[state=on]:underline',
  ),
  plain: cn(
    'border border-ink/30 px-3 py-2 text-left text-sm text-ink hover:border-ink',
    'data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:font-semibold',
    'data-[state=on]:text-paper',
  ),
  tiles: cn(
    'flex h-11 w-11 items-center justify-center border border-ink/30 font-figurine text-xl text-ink',
    'hover:border-ink data-[state=on]:border-ink data-[state=on]:bg-ink',
    'data-[state=on]:text-paper',
  ),
} as const

type GroupVariant = keyof typeof GROUP

const ToggleGroupContext = createContext<GroupVariant>('segmented')

const ToggleGroup = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & { variant?: GroupVariant }
>(function ToggleGroup({ className, variant = 'segmented', children, ...props }, ref) {
  return (
    <ToggleGroupPrimitive.Root ref={ref} className={cn(GROUP[variant], className)} {...props}>
      <ToggleGroupContext.Provider value={variant}>{children}</ToggleGroupContext.Provider>
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
      className={cn(
        'transition-colors disabled:pointer-events-none disabled:opacity-50',
        ITEM[variant],
        className,
      )}
      {...props}
    />
  )
})

export { ToggleGroup, ToggleGroupItem }
