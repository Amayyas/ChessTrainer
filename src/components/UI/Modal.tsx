import type { ReactNode } from 'react'
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/Dialog'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Optional footer, typically action buttons. */
  footer?: ReactNode
  className?: string
}

/**
 * The common shape of a dialog — a title, a body, a row of actions — over the
 * Radix primitives in Dialog.tsx.
 *
 * It exists so the ordinary case stays one element with an `open` and an
 * `onClose`, which is the API every caller already had. Anything that needs a
 * different anatomy composes the primitives directly instead.
 */
export default function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        className={className}
        // Radix asks for a description and warns when it finds none. These
        // dialogs are labelled by their title and their body is arbitrary
        // content, so there is nothing to point at.
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <div className="text-muted-foreground">{children}</div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
