import type { ReactNode } from 'react'
import SquaresToggle from '@/components/Board/SquaresToggle'
import { cn } from '@/utils/cn'

/**
 * The line under a board the player plays on: its keyboard field, and the
 * squares toggle at the far end — below the field instead, where the column
 * is too narrow for both. The toggle comes with the line, so no board is
 * left without it.
 */
export default function BoardControls({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3',
        className,
      )}
    >
      {children}
      <SquaresToggle />
    </div>
  )
}
