import { describe, expect, it, vi } from 'vitest'
import {
  LICHESS_ORIGIN,
  LichessImportError,
  RECENT_GAMES,
  fetchRecentGames,
  gamesUrl,
  isLichessUsername,
  readGame,
} from '@/features/coach/lichess'

const PGN =
  '[Event "Rated blitz game"]\n[White "alice"]\n[Black "bob"]\n\n1. e4 e5 2. Nf3 Nc6 1-0\n'

/** A line of the export as Lichess writes it, with the fields the import reads. */
function line(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 'abcd1234',
    variant: 'standard',
    speed: 'blitz',
    createdAt: Date.UTC(2026, 10, 18),
    winner: 'white',
    players: { white: { user: { name: 'alice' } }, black: { user: { name: 'bob' } } },
    pgn: PGN,
    ...overrides,
  })
}

const answer = (status: number, body = '') =>
  vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch

describe('isLichessUsername', () => {
  it('takes what Lichess takes and nothing else', () => {
    expect(isLichessUsername('DrNykterstein')).toBe(true)
    expect(isLichessUsername('a_b-9')).toBe(true)
    expect(isLichessUsername('a')).toBe(false)
    expect(isLichessUsername('x'.repeat(31))).toBe(false)
    expect(isLichessUsername('../api/account')).toBe(false)
    expect(isLichessUsername('bob smith')).toBe(false)
  })
})

describe('gamesUrl', () => {
  it('asks Lichess for the last games, as JSON with their PGN', () => {
    const url = new URL(gamesUrl('alice'))
    expect(url.origin).toBe(LICHESS_ORIGIN)
    expect(url.pathname).toBe('/api/games/user/alice')
    expect(url.searchParams.get('max')).toBe(String(RECENT_GAMES))
    expect(url.searchParams.get('pgnInJson')).toBe('true')
  })
})

describe('readGame', () => {
  it('reads a standard game', () => {
    expect(readGame(line())).toEqual({
      id: 'abcd1234',
      white: 'alice',
      black: 'bob',
      winner: 'w',
      speed: 'blitz',
      playedAt: new Date(Date.UTC(2026, 10, 18)),
      pgn: PGN,
    })
  })

  it('names an anonymous player, and reads a draw', () => {
    const game = readGame(line({ players: { white: { user: { name: 'alice' } }, black: {} } }))
    expect(game?.black).toBe('Anonyme')
    expect(readGame(line({ winner: undefined }))?.winner).toBeNull()
  })

  it('leaves out what the coach cannot load', () => {
    expect(readGame(line({ variant: 'chess960' }))).toBeNull()
    expect(readGame(line({ pgn: undefined }))).toBeNull()
    expect(readGame('not json')).toBeNull()
  })
})

describe('fetchRecentGames', () => {
  it('returns the games of the export, skipping the ones it cannot load', async () => {
    const body = [line(), line({ id: 'v960', variant: 'chess960' }), line({ id: 'zz' })].join('\n')
    const games = await fetchRecentGames(' alice ', { fetcher: answer(200, body) })
    expect(games.map((game) => game.id)).toEqual(['abcd1234', 'zz'])
  })

  it('sends nothing for a name Lichess would refuse', async () => {
    const fetcher = answer(200)
    await expect(fetchRecentGames('no spaces please', { fetcher })).rejects.toEqual(
      new LichessImportError('invalid'),
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    [404, 'unknown'],
    [429, 'rate-limited'],
    [503, 'unreachable'],
  ])('words an answer of %i as %s', async (status, reason) => {
    await expect(fetchRecentGames('alice', { fetcher: answer(status) })).rejects.toHaveProperty(
      'reason',
      reason,
    )
  })

  it('calls it unreachable when no answer comes', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(fetchRecentGames('alice', { fetcher })).rejects.toHaveProperty(
      'reason',
      'unreachable',
    )
  })
})
