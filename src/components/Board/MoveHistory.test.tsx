import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MoveHistory from '@/components/Board/MoveHistory'
import { MOVE_QUALITY } from '@/utils/evaluation'

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
    expect(screen.getByText('Nf3')).toBeInTheDocument()
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
