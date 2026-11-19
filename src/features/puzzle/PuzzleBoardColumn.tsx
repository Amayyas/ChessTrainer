import { BoardControls, ChessBoard, MoveInput } from '@/components/Board'
import type { PuzzleRunner } from '@/features/puzzle/usePuzzleRunner'
import { cn } from '@/utils/cn'

interface PuzzleBoardColumnProps {
  runner: PuzzleRunner
  /** Whether the board and the keyboard field take a move. */
  interactive: boolean
  /** What the keyboard field says while it takes none. */
  idleMessage: string
}

/**
 * The board column every puzzle mode shares: the board in its answering frame,
 * the keyboard field under it, and the answer said in words.
 */
export default function PuzzleBoardColumn({
  runner,
  interactive,
  idleMessage,
}: PuzzleBoardColumnProps) {
  return (
    <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
      {/* The frame answers the move: ink for a right one, the rubric for a
            wrong one. Said in words too, for a screen reader, which the frame
            alone never told. */}
      <div
        className={cn(
          'outline outline-[3px] outline-offset-[3px]',
          runner.feedback === 'correct' && 'outline-ink',
          runner.feedback === 'wrong' && 'outline-rubric',
          !runner.feedback && 'outline-transparent',
        )}
      >
        <ChessBoard
          fen={runner.fen}
          turn={runner.solverColor}
          orientation={runner.solverColor === 'w' ? 'white' : 'black'}
          interactive={interactive}
          onMove={runner.attempt}
          getLegalTargets={runner.getLegalTargets}
          isPromotion={runner.isPromotion}
          lastMove={runner.lastMove}
          moves={runner.played}
        />
      </div>
      <BoardControls>
        <MoveInput
          fen={runner.fen}
          turn={runner.solverColor}
          enabled={interactive}
          onMove={runner.attempt}
          getLegalTargets={runner.getLegalTargets}
          isPromotion={runner.isPromotion}
          idleMessage={idleMessage}
        />
      </BoardControls>
      <p role="status" className="sr-only">
        {runner.feedback === 'correct'
          ? 'Bon coup.'
          : runner.feedback === 'wrong'
            ? 'Ce n’est pas le coup attendu.'
            : ''}
      </p>
    </div>
  )
}
