import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUZZLES } from '@/features/puzzle/puzzles'
import { RUSH_DURATION_MS, RUSH_MAX_STRIKES } from '@/features/puzzle/rushSet'
import type { UseRushSession } from '@/features/puzzle/useRushSession'
import RushView from '@/features/puzzle/RushView'

// The board needs a real browser; the view is checked around it.
vi.mock('@/features/puzzle/PuzzleBoardColumn', () => ({
  default: ({ interactive }: { interactive: boolean }) => (
    <p>plateau {interactive ? 'actif' : 'en pause'}</p>
  ),
}))

let rush: UseRushSession
vi.mock('@/features/puzzle/useRushSession', () => ({ useRushSession: () => rush }))

const puzzle = PUZZLES[0]!
const runs = [
  { score: 14, at: '2026-11-12T10:00:00.000Z' },
  { score: 9, at: '2026-11-15T10:00:00.000Z' },
]

function session(overrides: Partial<UseRushSession> = {}): UseRushSession {
  return {
    fen: puzzle.fen,
    solverColor: puzzle.sideToMove,
    feedback: null,
    errors: 0,
    hintLevel: 0,
    hintMessages: [],
    isSolved: false,
    elapsedMs: 0,
    attempt: () => false,
    revealHint: () => {},
    getLegalTargets: () => [],
    isPromotion: () => false,
    lastMove: null,
    played: [],
    phase: 'ready',
    puzzle: null,
    solved: 0,
    strikes: 0,
    remainingMs: 0,
    isPaused: false,
    ranking: [],
    lastRun: null,
    isNewBest: false,
    start: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  rush = session()
})

describe('RushView before a run', () => {
  it('states the rules from the figures that enforce them', () => {
    render(<RushView />)
    expect(screen.getByText(new RegExp(`^${RUSH_DURATION_MS / 60_000} minutes`))).toHaveTextContent(
      `à ${RUSH_MAX_STRIKES} erreurs`,
    )
  })

  it('says there is no record yet, then starts on demand', async () => {
    render(<RushView />)
    expect(screen.getByText(/le premier fixera votre record/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Lancer le Rush' }))
    expect(rush.start).toHaveBeenCalledOnce()
  })

  it('shows the ranking, best first', () => {
    rush = session({ ranking: runs })
    render(<RushView />)
    const items = within(screen.getByRole('region', { name: 'Vos meilleurs Rush' })).getAllByRole(
      'listitem',
    )
    expect(items[0]).toHaveTextContent('1. 14 puzzles')
    expect(items[1]).toHaveTextContent('2. 9 puzzles')
  })
})

describe('RushView during a run', () => {
  it('reads the clock as minutes and seconds, and counts the strikes', () => {
    rush = session({ phase: 'running', puzzle, remainingMs: 155_000, solved: 4, strikes: 1 })
    render(<RushView />)
    expect(screen.getByText('2:35')).toBeInTheDocument()
    expect(screen.getByText(`1/${RUSH_MAX_STRIKES}`)).toBeInTheDocument()
    expect(screen.getByText('plateau actif')).toBeInTheDocument()
  })

  it('takes no move while an answer is shown', () => {
    rush = session({ phase: 'running', puzzle, isPaused: true })
    render(<RushView />)
    expect(screen.getByText('plateau en pause')).toBeInTheDocument()
  })
})

describe('RushView after a run', () => {
  it('celebrates a new record and marks the run in the ranking', () => {
    const lastRun = { score: 16, at: '2026-11-19T10:00:00.000Z' }
    rush = session({
      phase: 'over',
      puzzle,
      solved: 16,
      strikes: RUSH_MAX_STRIKES,
      ranking: [lastRun, ...runs],
      lastRun,
      isNewBest: true,
    })
    render(<RushView />)
    expect(screen.getByText('Nouveau record !')).toBeInTheDocument()
    expect(screen.getByText(`${RUSH_MAX_STRIKES} erreurs : le Rush s’arrête.`)).toBeInTheDocument()
    const current = within(screen.getByRole('region', { name: 'Vos meilleurs Rush' }))
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'true')
    expect(current).toHaveTextContent('16 puzzles')
  })

  it('says the clock ended it, and claims no record it did not set', () => {
    rush = session({
      phase: 'over',
      puzzle,
      solved: 5,
      strikes: 1,
      ranking: runs,
      lastRun: { score: 5, at: '2026-11-19T10:00:00.000Z' },
    })
    render(<RushView />)
    expect(screen.getByText('Temps écoulé.')).toBeInTheDocument()
    expect(screen.queryByText('Nouveau record !')).not.toBeInTheDocument()
  })
})
