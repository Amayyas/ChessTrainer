import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react'
import CloseGlyph from '@/components/UI/CloseGlyph'
import { cn } from '@/utils/cn'

/**
 * The dialog, on Radix.
 *
 * What this replaces was ninety lines of hand-written modal: a focus trap that
 * walked a querySelectorAll of focusable selectors, a keydown listener for
 * Escape and for wrapping Tab, a body scroll lock, a portal, and a ref that
 * restored focus on unmount. Radix does all of it, and does the parts that
 * version missed — pointer-down outside, aria-hidden on the rest of the page,
 * and the focus guards that keep a screen reader inside the dialog.
 *
 * The surface is drawn like a boxed aside: a two-pixel ink frame on bright
 * paper, square, with no shadow, over the page dimmed by an ink wash. It
 * appears and leaves without an animation, and closes on a typographic cross
 * rather than an icon from a library.
 */

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-ink/50', className)}
      {...props}
    />
  )
})

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(function DialogContent({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'border-2 border-ink bg-paper-bright p-6 text-ink',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} />
}

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-heading font-semibold text-ink', className)}
      {...props}
    />
  )
})

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-caption text-ink-soft', className)}
      {...props}
    />
  )
})

/** The corner close button. Its label is copy the player reads, so it is French. */
const DialogCloseButton = forwardRef<
  ElementRef<typeof DialogPrimitive.Close>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(function DialogCloseButton({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Close
      ref={ref}
      aria-label="Fermer"
      className={cn(
        '-mr-3 -mt-3 inline-flex h-11 w-11 shrink-0 items-center justify-center',
        'text-ink-soft transition-colors hover:text-rubric',
        className,
      )}
      {...props}
    >
      <CloseGlyph />
    </DialogPrimitive.Close>
  )
})

export {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
