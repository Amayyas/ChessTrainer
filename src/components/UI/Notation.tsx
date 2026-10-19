import { Fragment } from 'react'
import { FIGURINES, FRENCH_LETTERS, notationParts } from '@/utils/notation'
import { cn } from '@/utils/cn'

export interface NotationProps {
  /** The move in English SAN, as chess.js writes it. */
  san: string
  className?: string
}

/**
 * A move in figurine notation: ♞f3 on the page, "C f3" to a screen reader.
 *
 * The figurine is a box exactly one of its ems wide, which is the width every
 * piece has in the self-hosted face. Until that face arrives the system's
 * symbol font draws it, at a width of its own; the box keeps the rest of the
 * move from shifting when the swap happens.
 */
export default function Notation({ san, className }: NotationProps) {
  return (
    <span className={cn('whitespace-nowrap', className)}>
      {notationParts(san).map((part, index) =>
        'piece' in part ? (
          <Fragment key={index}>
            <span
              aria-hidden="true"
              className="inline-block w-[1em] text-center font-figurine text-[0.9em] leading-none"
            >
              {FIGURINES[part.piece]}
            </span>
            <span className="sr-only">{FRENCH_LETTERS[part.piece]}</span>
          </Fragment>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </span>
  )
}
