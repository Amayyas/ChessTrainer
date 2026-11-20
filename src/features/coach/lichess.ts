import type { Color } from '@/utils/chess'

/**
 * A player's recent games on Lichess, read from its public API.
 *
 * The request goes from the player's browser straight to lichess.org, which
 * allows it (`Access-Control-Allow-Origin: *`) and asks for no token for public
 * games. The Content-Security-Policy names that host in connect-src, and
 * nothing wider. Measured on 20 November 2026 from a residential connection:
 * the export answers 200 in ndjson. From a datacentre address the same request
 * answered 404 for every account, which is Lichess's doing, not the account's.
 */
export const LICHESS_ORIGIN = 'https://lichess.org'

/** How many games are offered: the recent ones, which are the ones a player wants to review. */
export const RECENT_GAMES = 10

export interface LichessGame {
  id: string
  white: string
  black: string
  winner: Color | null
  /** 'bullet', 'blitz', 'rapid', 'classical'… as Lichess names the pace. */
  speed: string
  playedAt: Date
  pgn: string
}

export type LichessError = 'invalid' | 'unknown' | 'rate-limited' | 'unreachable'

export class LichessImportError extends Error {
  constructor(readonly reason: LichessError) {
    super(reason)
  }
}

/**
 * Lichess's own rule for a username: 2 to 30 letters, digits, underscores and
 * hyphens. Checked before any request, so a typo never leaves the page.
 */
export function isLichessUsername(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(name)
}

/** The export's address for a player's last games, standard chess only, with the moves as PGN. */
export function gamesUrl(username: string): string {
  const query = new URLSearchParams({
    max: String(RECENT_GAMES),
    pgnInJson: 'true',
    clocks: 'false',
    evals: 'false',
    opening: 'false',
    // The perf types of standard chess: the coach plays no variant.
    perfType: 'ultraBullet,bullet,blitz,rapid,classical,correspondence',
  })
  return `${LICHESS_ORIGIN}/api/games/user/${encodeURIComponent(username)}?${query}`
}

/** One line of the ndjson export, or null when it is not a standard game the coach can load. */
export function readGame(line: string): LichessGame | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const game = raw as Record<string, unknown>
  const players = game.players as Record<string, { user?: { name?: unknown } }> | undefined
  const nameOf = (color: 'white' | 'black') => {
    const name = players?.[color]?.user?.name
    // An anonymous player or the engine carries no user.
    return typeof name === 'string' ? name : 'Anonyme'
  }
  if (
    typeof game.id !== 'string' ||
    game.variant !== 'standard' ||
    typeof game.pgn !== 'string' ||
    typeof game.createdAt !== 'number'
  ) {
    return null
  }
  return {
    id: game.id,
    white: nameOf('white'),
    black: nameOf('black'),
    winner: game.winner === 'white' ? 'w' : game.winner === 'black' ? 'b' : null,
    speed: typeof game.speed === 'string' ? game.speed : '',
    playedAt: new Date(game.createdAt),
    pgn: game.pgn,
  }
}

/**
 * The player's last games, most recent first. Throws a LichessImportError the
 * page can word: a name Lichess would not accept, a player it does not know,
 * too many requests, or no answer at all.
 */
export async function fetchRecentGames(
  username: string,
  { signal, fetcher = fetch }: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<LichessGame[]> {
  const name = username.trim()
  if (!isLichessUsername(name)) throw new LichessImportError('invalid')

  let response: Response
  try {
    response = await fetcher(gamesUrl(name), {
      headers: { Accept: 'application/x-ndjson' },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new LichessImportError('unreachable')
  }
  if (response.status === 404) throw new LichessImportError('unknown')
  if (response.status === 429) throw new LichessImportError('rate-limited')
  if (!response.ok) throw new LichessImportError('unreachable')

  const text = await response.text()
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(readGame)
    .filter((game): game is LichessGame => game !== null)
}
