import type { ReactNode } from 'react'
import { RUBRIC_INLINE } from '@/components/UI/rubricBlock'
import Spinner from '@/components/UI/Spinner'
import { cn } from '@/utils/cn'

/**
 * A page's state, on the line beside its title: capitals, after a spinner
 * while work is under way and a dot once it is done. The spinner and the dot
 * take the same room, so the words do not shift when one replaces the other.
 *
 * A polite live region, so a screen reader hears the state change — "IA
 * prête" once the engine is up — without the spinner announcing itself.
 *
 * A state that needs acting on is set as an alert, the rubric as a solid
 * block, in the same line rather than in an element of its own: a live region
 * is heard when its words change, not when it is taken away, so swapping it
 * for a tag left the one state that mattered unsaid.
 */
export default function StatusLine({
  busy = false,
  alert = false,
  children,
}: {
  busy?: boolean
  alert?: boolean
  children: ReactNode
}) {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-2 text-kicker font-semibold uppercase',
        alert ? RUBRIC_INLINE : 'text-ink-soft',
      )}
    >
      <span aria-hidden="true" className="inline-flex size-4 items-center justify-center">
        {busy ? (
          <Spinner size="sm" />
        ) : (
          <span className={cn('size-2 rounded-full', alert ? 'bg-paper-bright' : 'bg-ink')} />
        )}
      </span>
      {children}
    </span>
  )
}
