import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import type { PieceSymbol, Square } from '@/utils/chess'
import { cn } from '@/utils/cn'
import { readMove, type MovePosition } from '@/utils/moveText'

export interface MoveInputProps extends MovePosition {
  /** Whether the board takes a move now. */
  enabled: boolean
  /** Plays a move, as the board's own onMove does. True if it was applied. */
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  /** What to say when a move is sent while the board takes none. */
  idleMessage?: string
  className?: string
}

/**
 * The board's keyboard: a field under it where a move is typed, in French
 * notation or from square to square, and played on Enter. chessground is
 * driven by the pointer alone, so this is how the board is played without one.
 *
 * The field stays put when the board stops taking moves — while the engine
 * replies, say — so the focus stays in it from one move to the next, and a
 * move typed ahead is kept rather than lost. Whatever goes wrong is said in a
 * live region, and the text stays for the player to correct.
 */
export default function MoveInput({
  fen,
  turn,
  getLegalTargets,
  isPromotion,
  enabled,
  onMove,
  idleMessage = 'Aucun coup n’est attendu pour l’instant.',
  className,
}: MoveInputProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  // What went wrong, and whether it was the text: an unreadable or illegal
  // move marks the field invalid, a board that takes no move does not.
  const [message, setMessage] = useState<{ text: string; invalid: boolean } | null>(null)

  // A new position makes what was said about the old one stale.
  useEffect(() => setMessage(null), [fen])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    inputRef.current?.focus()
    // The FEN says whose move it is; a board waiting on the other side, as a
    // puzzle does while its reply is on the way, takes nothing either.
    if (!enabled || fen.split(' ')[1] !== turn) {
      setMessage({
        text: enabled ? 'Ce n’est pas à vous de jouer.' : idleMessage,
        invalid: false,
      })
      return
    }
    const move = readMove(text, { fen, turn, getLegalTargets, isPromotion })
    if ('error' in move) {
      setMessage({ text: move.error, invalid: true })
      return
    }
    if (onMove(move.from, move.to, move.promotion)) {
      setText('')
      setMessage(null)
    } else {
      // Refused by the page — a puzzle's wrong answer, which the page says
      // itself. The text stays, selected, so the next try replaces it.
      inputRef.current?.select()
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
        Jouer au clavier
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
        Par exemple e4, Cf3, O-O, e8=D ou e2e4.
      </p>
      <p id={`${id}-message`} aria-live="polite" className="text-caption text-rubric">
        {message?.text}
      </p>
    </form>
  )
}
