import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import Spinner from '@/components/UI/Spinner'
import { cn } from '@/utils/cn'

/**
 * The button, on shadcn's structure and the project's palette.
 *
 * Two things are deliberately unchanged from the hand-written version it
 * replaces: the variant and size names, so no call site moves, and the classes
 * each one resolves to, so nothing on screen moves either. What is new is the
 * shape — variants declared in cva instead of two lookup records, and `asChild`,
 * which lets a router link wear the button's clothes without the styles being
 * copied onto it.
 *
 * The focus ring is the one global rule in index.css, not shadcn's own
 * `focus-visible:ring-1`: the rest of the app rings at 2px in gold, and a
 * thinner ring here would only be visible as an inconsistency.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center rounded-xl font-semibold',
    // One transition-property class, not two. `transition-colors` beside
    // `transition-transform` sets the same property twice: tailwind-merge keeps
    // the later one and Tailwind's own rule order would have done the same, so
    // the pair silently reduced to the transform and every hover colour
    // snapped. Card.tsx already had it in this shape.
    'transition-[color,background-color,border-color,box-shadow,transform]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    // The press was a Framer Motion `whileTap` on a motion.button. In CSS it
    // costs no animation runtime, honours the reduced-motion query without a
    // hook, and leaves the element a plain <button> for Slot to merge into.
    'active:scale-[0.97] motion-reduce:active:scale-100',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        // Gold with ebony on it. Gold text on a light surface reaches 2.3:1 and
        // fails WCAG AA, which is what fixes the direction of this pair.
        //
        // `bg-or-light` is a palette literal where its neighbours use tokens,
        // and it is safe where they would not be: gold is the one pair that
        // .theme-inverse leaves alone, so the hover cannot drift from the rest
        // on a dark surface.
        primary: 'bg-primary text-primary-foreground shadow-gold hover:bg-or-light',
        // The hover is a token too, not `bg-ebene-light`. Inside .theme-inverse
        // the secondary pair flips to ebony-on-ivory, and a hard ebony hover
        // there painted the surface dark while the label stayed dark with it:
        // about 1.2:1, which is an invisible label.
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        ghost: 'bg-transparent text-foreground hover:bg-foreground/5',
        outline:
          'border border-foreground/20 text-foreground hover:border-foreground/40 hover:bg-foreground/5',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 gap-1.5 px-3 text-sm',
        md: 'h-11 gap-2 px-5 text-sm',
        lg: 'h-14 gap-2.5 px-7 text-base',
        icon: 'h-11 w-11',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
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
    variant,
    size,
    fullWidth,
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
      // A Slot child brings its own element, and `type` and `disabled` belong
      // to form controls. Spelling them onto an <a> emits attributes that mean
      // nothing there, and React warns about the boolean one.
      {...(asChild ? {} : { type: type ?? 'button', disabled: isInert })}
      aria-disabled={asChild && isInert ? true : undefined}
      aria-busy={isLoading || undefined}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        // A slotted element takes none of that. `disabled:` never matches on an
        // anchor, so a disabled asChild button announced itself as disabled and
        // navigated anyway, on click and on Enter. The state has to be spelled
        // out in classes that do apply.
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
export { buttonVariants }
