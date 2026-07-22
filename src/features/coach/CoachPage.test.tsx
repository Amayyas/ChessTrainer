import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CoachPage from '@/features/coach/CoachPage'

/** The page reads router state (a game handed over from the battle mode). */
function renderCoach() {
  return render(
    <MemoryRouter>
      <CoachPage />
    </MemoryRouter>,
  )
}

// The board itself needs a real browser (Worker + measured width); these tests
// cover the free-analysis wiring, which is independent of the board rendering.
describe('CoachPage free analysis', () => {
  it('starts in game mode with White to move', () => {
    renderCoach()
    expect(screen.getByText('Trait aux blancs')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Position de départ/)).not.toBeInTheDocument()
  })

  it('loads a pasted FEN as the starting position', () => {
    renderCoach()
    fireEvent.click(screen.getByRole('button', { name: 'Analyse libre' }))

    const input = screen.getByLabelText(/Position de départ/)
    // Position after 1.e4 — Black to move.
    fireEvent.change(input, {
      target: { value: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Charger' }))

    expect(screen.getByText('Trait aux noirs')).toBeInTheDocument()
  })

  it('rejects an invalid FEN with an error message', () => {
    renderCoach()
    fireEvent.click(screen.getByRole('button', { name: 'Analyse libre' }))

    fireEvent.change(screen.getByLabelText(/Position de départ/), {
      target: { value: 'not a fen' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Charger' }))

    expect(screen.getByText('FEN invalide.')).toBeInTheDocument()
    expect(screen.getByText('Trait aux blancs')).toBeInTheDocument()
  })
})
