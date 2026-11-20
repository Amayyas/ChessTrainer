import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CoachPage from '@/features/coach/CoachPage'

// The image itself needs a canvas; what is checked here is what the coach asks
// it to draw.
vi.mock('@/features/share/ShareDiagram', () => ({
  default: ({ request }: { request: unknown }) => (
    <pre data-testid="diagram-request">{JSON.stringify(request)}</pre>
  ),
}))

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

  it('says a check in the same live line as the turn', () => {
    // The state line was swapped for an alert tag when a check came, outside
    // any live region, so a screen reader user was never told of the check.
    renderCoach()
    const state = within(screen.getByRole('region', { name: 'État de la partie' }))
    const line = state.getByRole('status')
    expect(line).toHaveTextContent('Trait aux blancs')

    fireEvent.click(screen.getByRole('radio', { name: 'Analyse libre' }))
    // After 1.e4 e5 2.Bc4 d6 3.Bxf7+: Black is in check, and not mated.
    fireEvent.change(screen.getByLabelText(/Position de départ/), {
      target: { value: 'rnbqkbnr/ppp2Bpp/3p4/4p3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Charger' }))

    expect(state.getByRole('status')).toBe(line)
    expect(line).toHaveTextContent(/Échec/)
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

describe('CoachPage diagram sharing', () => {
  it('shares the position on the board, in review the one being looked at', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/coach', state: { pgn: '1. e4 e5' } }]}>
        <CoachPage />
      </MemoryRouter>,
    )
    const request = () => JSON.parse(screen.getByTestId('diagram-request').textContent!)

    // A game handed over opens in review at its first position: no move yet.
    expect(request().lastMove).toBeNull()
    expect(request().fen.split(' ')[0]).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')

    fireEvent.click(screen.getByRole('button', { name: 'Fin' }))
    expect(request().lastMove.san).toBe('e5')
    expect(request().fen.split(' ')[1]).toBe('w')
    expect(request().orientation).toBe('w')
  })
})
