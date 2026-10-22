import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import { cn } from '@/utils/cn'

/**
 * What became of what was typed: played, refused by the page (which says why
 * itself), or a sentence for the player and whether the text was at fault.
 */
export type KeyboardOutcome = 'played' | 'refused' | { message: string; invalid: boolean }

export interface KeyboardFieldProps {
  /** The field's name, shown above it. */
  label: string
  /** The line under the field, saying what to type. */
  example: string
  /** Whether the board takes a move now; the field stays usable either way. */
  enabled: boolean
  /** Reads what was typed, and plays it if it can. */
  onSubmit: (text: string) => KeyboardOutcome
  /** The position: when it changes, what was said about the last one goes. */
  position: string
  className?: string
}

/**
 * A board's keyboard: a field under it, played on Enter. chessground is driven
 * by the pointer alone, so this is how a board is played without one.
 *
 * The field stays put when the board stops taking moves — while the engine
 * replies, say — so the focus stays in it from one move to the next, and a
 * move typed ahead is kept rather than lost. Whatever goes wrong is said in a
 * live region, and the text stays for the player to correct.
 */
export default function KeyboardField({
  label,
  example,
  enabled,
  onSubmit,
  position,
  className,
}: KeyboardFieldProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  // What went wrong, and whether it was the text: an unreadable or illegal
  // move marks the field invalid, a board that takes no move does not.
  const [message, setMessage] = useState<{ text: string; invalid: boolean } | null>(null)

  // A new position makes what was said about the old one stale.
  useEffect(() => setMessage(null), [position])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    inputRef.current?.focus()
    const outcome = onSubmit(text)
    if (outcome === 'played') {
      setText('')
      setMessage(null)
    } else if (outcome === 'refused') {
      // The text stays, selected, so the next try replaces it.
      inputRef.current?.select()
    } else {
      setMessage({ text: outcome.message, invalid: outcome.invalid })
    }
  }

  return (
    // As wide as a move needs and some room, not the board's width: a field
    // drawn across the whole column reads as a form to fill in.
    <form
      onSubmit={submit}
      noValidate
      className={cn('flex w-full max-w-sm flex-col gap-1.5', className)}
    >
      <label htmlFor={`${id}-move`} className="text-caption font-semibold">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={`${id}-move`}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setMessage(null)
          }}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={16}
          aria-invalid={message?.invalid || undefined}
          aria-describedby={`${id}-hint${message ? ` ${id}-message` : ''}`}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          aria-disabled={!enabled || undefined}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          Jouer
        </Button>
      </div>
      {/* One line under the field: the example, or what went wrong in its
          place. The message is a live region from the start, so the first
          thing put in it is heard. */}
      <p id={`${id}-hint`} hidden={Boolean(message)} className="text-caption italic text-ink-soft">
        {example}
      </p>
      <p id={`${id}-message`} aria-live="polite" className="text-caption text-rubric">
        {message?.text}
      </p>
    </form>
  )
}
