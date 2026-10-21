import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import MoveInput from '@/components/Board/MoveInput'
import { useChessGame } from '@/hooks/useChessGame'
import { MOVE_EXAMPLES_LINE } from '@/utils/moveText'

function Harness({
  fen,
  enabled = true,
  refuse = false,
  turn,
}: {
  fen?: string
  enabled?: boolean
  refuse?: boolean
  turn?: 'w' | 'b'
}) {
  const game = useChessGame(fen)
  return (
    <div>
      <MoveInput
        fen={game.fen}
        turn={turn ?? game.turn}
        enabled={enabled}
        onMove={(from, to, promotion) => !refuse && game.move(from, to, promotion) !== null}
        getLegalTargets={game.getLegalTargets}
        isPromotion={game.isPromotion}
        idleMessage="La partie est terminée."
      />
      <p data-testid="history">{game.sanHistory.join(' ')}</p>
      {/* A move made elsewhere, as the engine makes its reply. */}
      <button type="button" onClick={() => game.move('e2', 'e4')}>
        Coup joué ailleurs
      </button>
    </div>
  )
}

const field = () => screen.getByRole('textbox', { name: 'Jouer au clavier' })

const EXAMPLE = 'Par exemple e4, Cf3, O-O, e8=D ou e2e4.'

describe('MoveInput', () => {
  it('shows under the field the line made from the reader’s examples', () => {
    // The sentence the player reads, pinned. The reader's test pins the line it
    // makes to the same words, so a line written into the field by hand would
    // part from it the day the letters changed.
    render(<Harness />)
    expect(field()).toHaveAccessibleDescription(EXAMPLE)
    expect(field()).toHaveAccessibleDescription(MOVE_EXAMPLES_LINE)
  })

  it('plays the move typed on Enter, empties the field and keeps the focus in it', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(field(), 'Cf3{Enter}')
    expect(screen.getByTestId('history')).toHaveTextContent('Nf3')
    expect(field()).toHaveValue('')
    expect(field()).toHaveFocus()
  })

  it('plays it from the button too, and hands the focus back to the field', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(field(), 'e2e4')
    await user.click(screen.getByRole('button', { name: 'Jouer' }))
    expect(screen.getByTestId('history')).toHaveTextContent('e4')
    expect(field()).toHaveFocus()
  })

  it('says what is wrong with a move, keeps the text, and forgets it on the next key', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(field(), 'Cf6{Enter}')
    expect(screen.getByTestId('history')).toHaveTextContent('')
    expect(field()).toHaveValue('Cf6')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(field()).toHaveAccessibleDescription(/n’est pas un coup possible ici/)
    expect(screen.getByText(/n’est pas un coup possible ici/)).toHaveAttribute(
      'aria-live',
      'polite',
    )
    // The message takes the example's line rather than a line of its own.
    expect(screen.getByText(EXAMPLE)).not.toBeVisible()

    await user.type(field(), '{Backspace}3')
    expect(field()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(/n’est pas un coup possible ici/)).not.toBeInTheDocument()
    expect(field()).toHaveAccessibleDescription(EXAMPLE)
    expect(screen.getByText(EXAMPLE)).toBeVisible()
  })

  it('plays a promotion with the piece typed after the square', async () => {
    const user = userEvent.setup()
    render(<Harness fen="8/4P3/8/8/8/8/k7/4K3 w - - 0 1" />)
    await user.type(field(), 'e8=C{Enter}')
    expect(screen.getByTestId('history')).toHaveTextContent('e8=N')
  })

  it('stays usable while the board takes no move, and says so when one is sent', async () => {
    const user = userEvent.setup()
    render(<Harness enabled={false} />)
    // Not disabled: a disabled field would drop the focus at every reply.
    expect(field()).toBeEnabled()
    await user.type(field(), 'e4{Enter}')
    expect(screen.getByTestId('history')).toHaveTextContent('')
    expect(screen.getByText('La partie est terminée.')).toBeInTheDocument()
    expect(field()).not.toHaveAttribute('aria-invalid')
    expect(field()).toHaveValue('e4')
    expect(screen.getByRole('button', { name: 'Jouer' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('says it is not the player’s move while the board waits on the other side', async () => {
    const user = userEvent.setup()
    // The board is for Black, and White is to move.
    render(<Harness turn="b" />)
    await user.type(field(), 'e5{Enter}')
    expect(screen.getByText('Ce n’est pas à vous de jouer.')).toBeInTheDocument()
    expect(screen.getByTestId('history')).toHaveTextContent('')
  })

  it('leaves a move the page refuses selected, for the next try to replace', async () => {
    const user = userEvent.setup()
    render(<Harness refuse />)
    await user.type(field(), 'e4{Enter}')
    const input = field() as HTMLInputElement
    expect(input).toHaveValue('e4')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2])
  })

  it('drops what it said once the position changes', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(field(), 'Cf6{Enter}')
    expect(screen.getByText(/n’est pas un coup possible ici/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Coup joué ailleurs' }))
    expect(screen.queryByText(/n’est pas un coup possible ici/)).not.toBeInTheDocument()
  })
})
