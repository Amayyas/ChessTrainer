import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChessBoard } from '@/components/Board'
import { useChessGame } from '@/hooks/useChessGame'

/** Wires the board to a real game and surfaces the move list for assertions. */
function BoardHarness({ interactive = true }: { interactive?: boolean }) {
  const game = useChessGame()
  return (
    <div>
      <ChessBoard
        fen={game.fen}
        turn={game.turn}
        interactive={interactive}
        onMove={(from, to, promotion) => game.move(from, to, promotion) !== null}
        getLegalTargets={game.getLegalTargets}
        isPromotion={game.isPromotion}
        lastMove={game.lastMove}
        checkSquare={game.checkSquare}
        boardWidth={480}
      />
      <p data-testid="turn">{game.turn}</p>
      <p data-testid="history">{game.sanHistory.join(' ')}</p>
    </div>
  )
}

function clickSquare(square: string) {
  const el = document.querySelector(`[data-square="${square}"]`)
  if (!el) throw new Error(`Square ${square} not found`)
  fireEvent.click(el)
}

describe('ChessBoard', () => {
  it('plays a legal move by clicking origin then destination', () => {
    render(<BoardHarness />)
    clickSquare('e2')
    clickSquare('e4')
    expect(screen.getByTestId('history')).toHaveTextContent('e4')
    expect(screen.getByTestId('turn')).toHaveTextContent('b')
  })

  it('ignores a click on an illegal destination', () => {
    render(<BoardHarness />)
    clickSquare('e2')
    clickSquare('e5') // three squares from e2 is illegal
    expect(screen.getByTestId('history')).toHaveTextContent('')
    expect(screen.getByTestId('turn')).toHaveTextContent('w')
  })

  it('does not move when not interactive', () => {
    render(<BoardHarness interactive={false} />)
    clickSquare('e2')
    clickSquare('e4')
    expect(screen.getByTestId('history')).toHaveTextContent('')
  })

  it('highlights the legal destinations of a selected piece', () => {
    render(<BoardHarness />)
    clickSquare('e2')

    // react-chessboard applies customSquareStyles to a child of the data-square
    // element, so search the square's whole subtree.
    const hasTargetDot = (square: string) => {
      const cell = document.querySelector(`[data-square="${square}"]`)
      if (!cell) return false
      return Array.from(cell.querySelectorAll<HTMLElement>('*')).some((el) =>
        el.style.backgroundImage.includes('radial-gradient'),
      )
    }

    expect(hasTargetDot('e3')).toBe(true)
    expect(hasTargetDot('e4')).toBe(true)
    expect(hasTargetDot('e5')).toBe(false)
  })
})
