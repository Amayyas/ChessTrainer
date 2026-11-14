import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import OpeningNote from '@/features/coach/OpeningNote'
import { FIGURINES, FRENCH_LETTERS } from '@/utils/notation'

const opening = { eco: 'C50', name: 'Partie italienne, Giuoco Piano' }
const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Kf1', 'Nf6']

describe('OpeningNote', () => {
  it('heads the panel block with the ECO code and the name', () => {
    render(<OpeningNote reading={{ opening, exitPly: null }} sanMoves={moves} />)
    expect(screen.getByRole('region', { name: 'Ouverture' })).toHaveTextContent(
      'C50Partie italienne, Giuoco Piano',
    )
    expect(screen.getByText('Toujours dans la théorie.')).toBeInTheDocument()
  })

  it('numbers the move that left theory as the column does', () => {
    const { rerender } = render(<OpeningNote reading={{ opening, exitPly: 6 }} sanMoves={moves} />)
    // White's fourth move: the king's figurine, and its French letter for a
    // screen reader.
    expect(screen.getByText(/Sortie de la théorie au coup 4\./)).toHaveTextContent(
      `Sortie de la théorie au coup 4.${FIGURINES.K}${FRENCH_LETTERS.K}f1.`,
    )

    rerender(<OpeningNote reading={{ opening, exitPly: 7 }} sanMoves={moves} />)
    expect(screen.getByText(/Sortie de la théorie/)).toHaveTextContent(/au coup 4….*f6\.$/)
  })
})
