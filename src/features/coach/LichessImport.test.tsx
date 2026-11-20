import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LichessImport from '@/features/coach/LichessImport'
import { LichessImportError, type LichessGame } from '@/features/coach/lichess'
import { ROUTES } from '@/routes'

const fetchRecentGames = vi.fn()
vi.mock('@/features/coach/lichess', async (original) => ({
  ...(await original<typeof import('@/features/coach/lichess')>()),
  fetchRecentGames: (...args: unknown[]) => fetchRecentGames(...args),
}))

const game = (overrides: Partial<LichessGame>): LichessGame => ({
  id: 'g1',
  white: 'alice',
  black: 'bob',
  winner: 'w',
  speed: 'blitz',
  playedAt: new Date(Date.UTC(2026, 10, 18)),
  pgn: '1. e4 e5 *',
  ...overrides,
})

/** Where opening a game lands: the state it was handed. */
function Handed() {
  return <pre data-testid="handed">{JSON.stringify(useLocation().state)}</pre>
}

function page() {
  return render(
    <MemoryRouter initialEntries={['/import']}>
      <Routes>
        <Route path="/import" element={<LichessImport />} />
        <Route path={ROUTES.coach} element={<Handed />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function searchFor(name: string) {
  await userEvent.type(screen.getByLabelText('Pseudo Lichess'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Chercher' }))
}

beforeEach(() => fetchRecentGames.mockReset())

describe('LichessImport', () => {
  it('lists the player’s games with the result from their side', async () => {
    fetchRecentGames.mockResolvedValue([
      game({ id: 'won', white: 'alice', winner: 'w' }),
      game({ id: 'lost', white: 'carol', black: 'alice', winner: 'w' }),
      game({ id: 'drawn', winner: null }),
    ])
    page()
    await searchFor('Alice')
    const rows = await screen.findAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Victoire'),
      expect.stringContaining('Défaite'),
      expect.stringContaining('Nulle'),
    ])
  })

  it('hands the chosen game to the coach', async () => {
    fetchRecentGames.mockResolvedValue([game({ pgn: '1. d4 d5 *' })])
    page()
    await searchFor('alice')
    await userEvent.click(await screen.findByRole('button', { name: /alice – bob/ }))
    expect(JSON.parse(screen.getByTestId('handed').textContent!)).toEqual({ pgn: '1. d4 d5 *' })
  })

  it('says why nothing came back', async () => {
    fetchRecentGames.mockRejectedValue(new LichessImportError('unknown'))
    page()
    await searchFor('nobody')
    expect(await screen.findByText('Aucun joueur de ce nom sur Lichess.')).toBeInTheDocument()

    fetchRecentGames.mockResolvedValue([])
    await userEvent.click(screen.getByRole('button', { name: 'Chercher' }))
    expect(await screen.findByText('Aucune partie récente à importer.')).toBeInTheDocument()
  })
})
