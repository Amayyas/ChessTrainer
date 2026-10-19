import type { ReactNode } from 'react'
import Spinner from '@/components/UI/Spinner'

/**
 * A page's state, on the line beside its title: capitals, after a spinner
 * while work is under way and a dot once it is done. The spinner and the dot
 * take the same room, so the words do not shift when one replaces the other.
 *
 * A polite live region, so a screen reader hears the state change — "IA
 * prête" once the engine is up — without the spinner announcing itself.
 */
export default function StatusLine({
  busy = false,
  children,
}: {
  busy?: boolean
  children: ReactNode
}) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-kicker font-semibold uppercase text-ink-soft"
    >
      <span aria-hidden="true" className="inline-flex size-4 items-center justify-center">
        {busy ? <Spinner size="sm" /> : <span className="size-2 rounded-full bg-ink" />}
      </span>
      {children}
    </span>
  )
}
