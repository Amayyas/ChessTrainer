import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import Spinner from '@/components/UI/Spinner'
import { cn } from '@/utils/cn'

/**
 * The button, in the newsprint style: square, flat, its label set in capitals.
 *
 * One variant per level of emphasis. `primary` is ink with paper on it,
 * `secondary` a one-pixel ink frame, `quiet` an underlined word — the way a
 * column prints a secondary action. Nothing lifts or shrinks under the pointer:
 * the ink turns to the rubric instead — the fill of a primary, the frame and
 * the label of a secondary, the word of a quiet one. None of them changes its
 * ground alone, which inside a box would be the box's own paper.
 *
 * Inside `.theme-inverse` each variant swaps ink and paper, at rest and under
 * the pointer, so a button stays legible on the ebony bands the pages still
 * carry. Rubric text would not be (2.5:1), so there a primary fills with the
 * rubric under the pointer and a secondary fills with paper. The swap is
 * written into each variant, which makes it more specific than a className
 * colour: a caller cannot recolour a button on those bands. It goes with them.
 *
 * Labels wrap rather than overflow: set in tracked capitals, the longest of
 * them are wider than the column a box leaves on a 320 px screen. The sizes are
 * minimum heights, so a wrapped label grows the button instead of leaving it.
 *
 * The focus ring is the one global rule in index.css. The variant and the size
 * are also written to `data-variant` and `data-size`, so a test asks what a
 * button is rather than which classes it happens to carry.
 */
const VARIANTS = {
  primary: cn(
    'bg-ink text-paper hover:bg-rubric',
    '[.theme-inverse_&]:bg-paper [.theme-inverse_&]:text-ink',
    '[.theme-inverse_&]:hover:bg-rubric [.theme-inverse_&]:hover:text-paper-bright',
  ),
  secondary: cn(
    'border border-ink text-ink hover:border-rubric hover:text-rubric',
    '[.theme-inverse_&]:border-paper [.theme-inverse_&]:text-paper',
    '[.theme-inverse_&]:hover:border-paper [.theme-inverse_&]:hover:bg-paper',
    '[.theme-inverse_&]:hover:text-ink',
  ),
  quiet: cn(
    'text-ink underline decoration-1 underline-offset-[5px] hover:text-rubric',
    '[.theme-inverse_&]:text-paper [.theme-inverse_&]:hover:text-paper',
    '[.theme-inverse_&]:hover:decoration-2',
  ),
} as const

const SIZES = {
  sm: 'min-h-9 gap-1.5 px-3 py-1.5',
  md: 'min-h-11 gap-2 px-5 py-2',
  lg: 'min-h-12 gap-2.5 px-6 py-2.5',
} as const

export type ButtonVariant = keyof typeof VARIANTS
export type ButtonSize = keyof typeof SIZES

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  isLoading?: boolean
  /** Renders the child element as the button, styles and all. */
  asChild?: boolean
}

/**
 * Design-system button. Wraps a native <button> so type, disabled and every
 * ARIA attribute pass straight through.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    asChild = false,
    disabled,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  const isInert = Boolean(disabled) || isLoading

  return (
    <Comp
      ref={ref}
      {...(asChild ? {} : { type: type ?? 'button', disabled: isInert })}
      aria-disabled={asChild && isInert ? true : undefined}
      aria-busy={isLoading || undefined}
      data-variant={variant}
      data-size={size}
      className={cn(
        'inline-flex items-center justify-center text-center',
        'text-kicker font-semibold uppercase transition-colors',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        asChild && isInert && 'pointer-events-none cursor-not-allowed opacity-50',
        className,
      )}
      {...props}
    >
      {/* Slot merges into exactly one element child, so the spinner cannot be
          put beside it — `{false}{children}` is already two children and throws.
          A slotted element supplies its own content anyway. */}
      {asChild ? (
        children
      ) : (
        <>
          {isLoading && <Spinner size="sm" />}
          {children}
        </>
      )}
    </Comp>
  )
})

export default Button
