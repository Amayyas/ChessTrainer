import * as SheetPrimitive from '@radix-ui/react-dialog'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react'
import CloseGlyph from '@/components/UI/CloseGlyph'
import { cn } from '@/utils/cn'

/**
 * A panel that slides in from an edge. The same Radix dialog as Dialog.tsx —
 * same focus trap, same scroll lock, same aria-hidden on everything behind —
 * laid out against an edge instead of centred. Drawn the same way too: bright
 * paper behind a two-pixel ink rule on its open side, no shadow, no slide.
 *
 * Nothing in the entry chunk may import this file directly. Radix declares no
 * `sideEffects: false`, so a static import is never shaken out, and the mobile
 * menu is the only thing that uses it. It reaches the app through a dynamic
 * import; see MobileNavSheet.
 */

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = forwardRef<
  ElementRef<typeof SheetPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-ink/50', className)}
      {...props}
    />
  )
})

const SIDES = {
  top: 'inset-x-0 top-0 border-b-2',
  bottom: 'inset-x-0 bottom-0 border-t-2',
  left: 'inset-y-0 left-0 h-full w-3/4 border-r-2 sm:max-w-sm',
  right: 'inset-y-0 right-0 h-full w-3/4 border-l-2 sm:max-w-sm',
} as const

export interface SheetContentProps extends ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: keyof typeof SIDES
}

const SheetContent = forwardRef<ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  function SheetContent({ side = 'right', className, children, ...props }, ref) {
    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-50 border-ink bg-paper-bright p-6 text-ink',
            SIDES[side],
            className,
          )}
          {...props}
        >
          {children}
          {/* The label is copy the player reads, so it is French. */}
          <SheetPrimitive.Close
            aria-label="Fermer"
            className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center opacity-70 transition-opacity hover:opacity-100"
          >
            <CloseGlyph />
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    )
  },
)

function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...props} />
}

const SheetTitle = forwardRef<
  ElementRef<typeof SheetPrimitive.Title>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Title
      ref={ref}
      className={cn('text-heading font-semibold', className)}
      {...props}
    />
  )
})

const SheetDescription = forwardRef<
  ElementRef<typeof SheetPrimitive.Description>,
  ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Description ref={ref} className={cn('text-caption', className)} {...props} />
  )
})

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
