import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LeaderboardPage from '@/features/leaderboard/LeaderboardPage'
import ReportPhoto from '@/features/leaderboard/ReportPhoto'
import type { LeaderboardRow } from '@/features/leaderboard/useLeaderboard'
import { useAuthStore } from '@/store/useAuthStore'

const board = vi.hoisted(() => ({ rows: [] as LeaderboardRow[] }))

vi.mock('@/features/leaderboard/useLeaderboard', async () => ({
  ...(await vi.importActual<typeof import('@/features/leaderboard/useLeaderboard')>(
    '@/features/leaderboard/useLeaderboard',
  )),
  useLeaderboard: () => ({ rows: board.rows, isLoading: false, error: null }),
}))

const reportPhoto = vi.fn()
const initialState = useAuthStore.getState()

beforeEach(() => {
  reportPhoto.mockReset().mockResolvedValue(true)
  useAuthStore.setState(initialState, true)
  useAuthStore.setState({ reportPhoto, session: null })
  board.rows = []
})

describe('ReportPhoto', () => {
  it('reports only once the player confirms', async () => {
    render(<ReportPhoto target="player-2" username="hikaru" />)

    await userEvent.click(screen.getByRole('button', { name: 'Signaler la photo de hikaru' }))
    expect(reportPhoto).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Signaler' }))
    expect(reportPhoto).toHaveBeenCalledWith('player-2')
    expect(screen.getByRole('status')).toHaveTextContent('Photo signalée')
  })

  it('sends nothing when the player thinks better of it', async () => {
    render(<ReportPhoto target="player-2" username="hikaru" />)

    await userEvent.click(screen.getByRole('button', { name: 'Signaler la photo de hikaru' }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(reportPhoto).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Signaler la photo de hikaru' })).toBeVisible()
  })

  it('says so when the report did not go through, and lets it be tried again', async () => {
    reportPhoto.mockResolvedValue(false)
    render(<ReportPhoto target="player-2" username="hikaru" />)

    await userEvent.click(screen.getByRole('button', { name: 'Signaler la photo de hikaru' }))
    await userEvent.click(screen.getByRole('button', { name: 'Signaler' }))

    expect(screen.getByRole('alert')).toHaveTextContent("n'est pas parti")
    expect(screen.getByRole('button', { name: 'Signaler la photo de hikaru' })).toBeVisible()
  })
})

describe('the leaderboard offers a report', () => {
  const row = (userId: string, photoPath: string | null): LeaderboardRow => ({
    id: userId.length,
    userId,
    username: userId,
    avatarPiece: 'n',
    photoPath,
    piece: 'q',
    score: 10,
    captures: 2,
    playedAt: '2026-10-28T10:00:00.000Z',
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <LeaderboardPage />
      </MemoryRouter>,
    )

  it('to a signed-in player, for someone else’s photo only', () => {
    useAuthStore.setState({ session: { user: { id: 'me' } } as unknown as Session })
    board.rows = [row('me', 'me/a.jpg'), row('withphoto', 'withphoto/b.jpg'), row('nophoto', null)]
    renderPage()

    const reports = screen.getAllByRole('button', { name: /^Signaler la photo de / })
    expect(reports.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Signaler la photo de withphoto',
    ])
  })

  it('to nobody who is not signed in', () => {
    board.rows = [row('withphoto', 'withphoto/b.jpg')]
    renderPage()

    expect(screen.queryByRole('button', { name: /^Signaler la photo/ })).not.toBeInTheDocument()
  })
})
