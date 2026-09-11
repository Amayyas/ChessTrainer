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
//
// The mode switch is queried as a radio rather than a button. It was a pair of
// buttons carrying aria-pressed; a choice between two modes is a radio group,
// and the toggle group it moved to says so.
describe('CoachPage free analysis', () => {
  it('starts in game mode with White to move', () => {
    renderCoach()
    expect(screen.getByText('Trait aux blancs')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Position de départ/)).not.toBeInTheDocument()
  })

  it('loads a pasted FEN as the starting position', () => {
    renderCoach()
    fireEvent.click(screen.getByRole('radio', { name: 'Analyse libre' }))

    const input = screen.getByLabelText(/Position de départ/)
    // Position after 1.e4 — Black to move.
    fireEvent.change(input, {
      target: { value: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Charger' }))

    expect(screen.getByText('Trait aux noirs')).toBeInTheDocument()
  })

  it('will not let both modes be off at once', () => {
    renderCoach()
    const analysis = screen.getByRole('radio', { name: 'Analyse libre' })

    fireEvent.click(analysis)
    expect(screen.getByLabelText(/Position de départ/)).toBeInTheDocument()

    // Radix deselects on a second press of the option already on. The coach
    // would then be in neither mode, and the FEN field would vanish with no
    // game mode selected to fall back to.
    fireEvent.click(analysis)
    expect(analysis).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText(/Position de départ/)).toBeInTheDocument()
  })

  it('rejects an invalid FEN with an error message', () => {
    renderCoach()
    fireEvent.click(screen.getByRole('radio', { name: 'Analyse libre' }))

    fireEvent.change(screen.getByLabelText(/Position de départ/), {
      target: { value: 'not a fen' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Charger' }))

    expect(screen.getByText('FEN invalide.')).toBeInTheDocument()
    expect(screen.getByText('Trait aux blancs')).toBeInTheDocument()
  })
})
