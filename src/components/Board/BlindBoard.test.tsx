import { render, screen } from '@testing-library/react'
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import BlindBoard from '@/components/Board/BlindBoard'
import { FIGURINES, FRENCH_LETTERS } from '@/utils/notation'

function movesOf(...sans: string[]) {
  const chess = new Chess()
  for (const san of sans) chess.move(san)
  return chess.history({ verbose: true })
}

describe('BlindBoard', () => {
  it('says whose move it is before anything is played', () => {
    render(<BlindBoard moves={[]} turn="w" />)
    expect(screen.getByRole('region', { name: 'Partie à l’aveugle' })).toHaveTextContent(
      'Aucun coup joué. Trait aux blancs.',
    )
  })

  it('prints the last move with its number, never the position', () => {
    render(<BlindBoard moves={movesOf('e4', 'e5', 'Nf3', 'Nc6')} turn="w" />)
    const block = screen.getByRole('region', { name: 'Partie à l’aveugle' })
    expect(block).toHaveTextContent(`Dernier coup2…${FIGURINES.N}${FRENCH_LETTERS.N}c6`)
    // Nothing of the board itself: no picture, no description of the position.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(block).not.toHaveTextContent(/Blancs :/)
  })

  it('says each new move aloud, as the drawn board does', () => {
    const { container, rerender } = render(<BlindBoard moves={movesOf('e4')} turn="b" />)
    rerender(<BlindBoard moves={movesOf('e4', 'Nf6')} turn="w" />)
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).toHaveTextContent('Les noirs jouent Cavalier de g8 en f6.')
  })
})
