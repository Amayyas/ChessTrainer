import { fireEvent, render, screen, within } from '@testing-library/react'
import { Chess } from 'chess.js'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CoachPage from '@/features/coach/CoachPage'
import { readOpening } from '@/features/coach/openings'

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

describe('CoachPage opening', () => {
  it('names the opening of a game handed over, once the book has loaded', async () => {
    const pgn = '1. e4 c5 2. Nf3 d6'
    // What the page should show is what the book reads, not a label written
    // here: renaming an opening must not break a test of the page's wiring.
    const replay = new Chess()
    replay.loadPgn(pgn)
    const history = replay.history({ verbose: true })
    const atEnd = readOpening(history)!.opening.name
    const afterFirst = readOpening(history.slice(0, 1))!.opening.name
    // Two different names, or stepping back would prove nothing.
    expect(afterFirst).not.toBe(atEnd)

    render(
      <MemoryRouter initialEntries={[{ pathname: '/coach', state: { pgn } }]}>
        <CoachPage />
      </MemoryRouter>,
    )
    // A game handed over opens in review at its first position, where there
    // is no opening yet; the name follows the position on the board.
    await import('@/features/coach/openings')
    expect(screen.queryByRole('region', { name: 'Ouverture' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fin' }))
    const block = await screen.findByRole('region', { name: 'Ouverture' })
    expect(block).toHaveTextContent(atEnd)
    expect(block).toHaveTextContent('Toujours dans la théorie.')

    // Back to 1.e4: the name is the one of the position on the board.
    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Coup précédent' }))
    }
    expect(screen.getByRole('region', { name: 'Ouverture' })).toHaveTextContent(afterFirst)

    fireEvent.click(screen.getByRole('button', { name: 'Début' }))
    expect(screen.queryByRole('region', { name: 'Ouverture' })).not.toBeInTheDocument()
  })

  it('says nothing about an opening before a move is played', async () => {
    renderCoach()
    // Give the book time to load, so the absence is not just the wait.
    await import('@/features/coach/openings')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('region', { name: 'Ouverture' })).not.toBeInTheDocument()
  })
})
