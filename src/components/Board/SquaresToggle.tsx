import Button from '@/components/UI/Button'
import { useBoardStore } from '@/store/useBoardStore'
import { cn } from '@/utils/cn'

/**
 * The switch from the hatched squares to plain ones, under each board the
 * player plays on. A toggle keeps one name whatever its state, so it is
 * "Cases unies", pressed or not; the box beside the name is ticked when the
 * squares are plain, as a printed form is ticked.
 */
export default function SquaresToggle({ className }: { className?: string }) {
  const plain = useBoardStore((state) => state.squares === 'plain')
  const setSquares = useBoardStore((state) => state.setSquares)
  return (
    <Button
      variant="quiet"
      size="sm"
      aria-pressed={plain}
      onClick={() => setSquares(plain ? 'hatched' : 'plain')}
      className={cn('gap-2', className)}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-3.5 shrink-0 items-center justify-center border border-ink bg-paper-bright"
      >
        {plain && (
          <svg viewBox="0 0 12 12" className="size-3" fill="none">
            <path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        )}
      </span>
      Cases unies
    </Button>
  )
}
