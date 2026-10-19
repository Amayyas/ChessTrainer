import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * What needs acting on: the rubric as a solid block, in caption type, read out
 * as an alert. A link inside keeps the block's paper under the pointer and
 * thickens its underline instead, whatever its own classes say: an inline
 * link turns to the rubric, which here is the ground, and one did — it
 * vanished under the pointer on the screen whose only way forward it was.
 */
export default function Alert({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      role="alert"
      className={cn(
        'bg-rubric px-3 py-2 text-caption text-paper-bright',
        '[&_a:hover]:text-paper-bright [&_a:hover]:decoration-2',
        className,
      )}
    >
      {children}
    </p>
  )
}
