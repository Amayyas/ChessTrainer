import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MoveHistory from '@/components/Board/MoveHistory'
import { MOVE_QUALITY } from '@/utils/evaluation'
import { FIGURINES, FRENCH_LETTERS } from '@/utils/notation'

/**
 * The move list is where the coach's grades actually reach the player: the
 * symbol beside each move is the whole visible output of the classification.
 * None of it was tested.
 */
describe('MoveHistory', () => {
  it('says so when nothing has been played', () => {
    render(<MoveHistory moves={[]} />)
    expect(screen.getByText(/Aucun coup joué/)).toBeInTheDocument()
  })

  it('pairs the moves by number', () => {
    render(<MoveHistory moves={['e4', 'e5', 'Nf3']} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
    // A lone white move ends the list rather than pairing with nothing.
    const [, second] = screen.getAllByRole('listitem')
    expect(second).toHaveTextContent(`2.${FIGURINES.N}${FRENCH_LETTERS.N}f3`)
  })

  it('writes the moves in figurines, never in English letters', () => {
    render(<MoveHistory moves={['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']} />)

    expect(screen.getByTestId('move-history')).not.toHaveTextContent(/[NB][a-h]/)
    expect(screen.getAllByText(FIGURINES.N)).toHaveLength(2)
    expect(screen.getByText(FIGURINES.B)).toBeInTheDocument()
  })

  it('marks the move being shown as the current step', () => {
    render(<MoveHistory moves={['e4', 'e5', 'Nf3']} activeIndex={1} />)

    const current = screen.getByTestId('move-history').querySelector('[aria-current="step"]')
    expect(current).toHaveTextContent('e5')
  })

  it('marks each move with the symbol its tier carries', () => {
    render(<MoveHistory moves={['e4', 'e5']} qualities={['best', 'blunder']} />)

    expect(screen.getByText(MOVE_QUALITY.best.symbol)).toBeInTheDocument()
    expect(screen.getByText(MOVE_QUALITY.blunder.symbol)).toBeInTheDocument()
  })

  it('colours the symbol with the token the tier declares', () => {
    render(<MoveHistory moves={['e4']} qualities={['blunder']} />)

    // The colour is half of what tells two tiers apart at a glance, and it is
    // the half no label would catch if the table and the list drifted.
    expect(screen.getByText(MOVE_QUALITY.blunder.symbol)).toHaveClass(MOVE_QUALITY.blunder.color)
  })

  it('leaves an ungraded move bare', () => {
    render(<MoveHistory moves={['e4', 'e5']} qualities={['best', null]} />)

    expect(screen.getByText(MOVE_QUALITY.best.symbol)).toBeInTheDocument()
    expect(screen.queryByText(MOVE_QUALITY.blunder.symbol)).not.toBeInTheDocument()
  })
})
