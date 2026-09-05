import { act, renderHook, waitFor } from '@testing-library/react'
import { Chess } from 'chess.js'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '@/features/coach/useCoachAnalysis'
import { useCoachPageState } from '@/features/coach/useCoachPageState'
import { XP_REWARDS } from '@/features/progression/levels'
import { useProgressionStore } from '@/store/useProgressionStore'

/**
 * The orchestration lifted out of CoachPage: mode and free-analysis FEN,
 * progressive hints, the replay, and — the piece most worth pinning — recording
 * a finished game exactly once, with the right battle metadata.
 *
 * The engine analysis is stubbed: its own maths lives in useCoachAnalysis.test.
 */

let summary: GameSummary = {
  accuracyWhite: null,
  accuracyBlack: null,
  isComplete: false,
  inaccuracies: 0,
  mistakes: 0,
  blunders: 0,
  bestMove: null,
}

vi.mock('@/features/coach/useCoachAnalysis', () => ({
  useCoachAnalysis: () => ({
    isReady: true,
    isAnalyzing: false,
    currentEval: null,
    bestMove: null,
    bestMoveUci: null,
    qualities: [],
    summary,
    analysisAt: () => ({ eval: null, bestMove: null }),
  }),
}))

/** A PGN in chess.js's own output format, the way the battle mode hands it over. */
function pgnOf(...moves: string[]): string {
  const chess = new Chess()
  for (const move of moves) chess.move(move)
  return chess.pgn()
}

const foolsMatePgn = pgnOf('f3', 'e5', 'g4', 'Qh4#')

function withRouter(state?: unknown) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[{ pathname: '/coach', state }]}>{children}</MemoryRouter>
  }
}

beforeEach(() => {
  useProgressionStore.getState().reset()
  summary = { ...summary, isComplete: false, accuracyWhite: null, accuracyBlack: null }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useCoachPageState', () => {
  it('starts a fresh game, not in replay', () => {
    const { result } = renderHook(() => useCoachPageState(), { wrapper: withRouter() })
    expect(result.current.mode).toBe('game')
    expect(result.current.inReplay).toBe(false)
    expect(result.current.game.sanHistory).toEqual([])
  })

  it('switching to free analysis seeds the FEN box and back to game resets', () => {
    const { result } = renderHook(() => useCoachPageState(), { wrapper: withRouter() })

    act(() => result.current.game.move('e2', 'e4'))
    act(() => result.current.selectMode('analysis'))
    expect(result.current.fenInput).toContain('rnbqkbnr/pppppppp') // after 1.e4, black to move
    expect(result.current.fenInput).toContain(' b ')

    act(() => result.current.selectMode('game'))
    expect(result.current.game.sanHistory).toEqual([])
  })

  it('rejects an invalid FEN and keeps the game untouched', () => {
    const { result } = renderHook(() => useCoachPageState(), { wrapper: withRouter() })
    act(() => result.current.selectMode('analysis'))
    act(() => result.current.setFenInput('not a fen'))
    act(() => result.current.loadFen())
    expect(result.current.fenError).toBe('FEN invalide.')
    expect(result.current.game.turn).toBe('w')
  })

  it('reveals hints up to the cap and resets them when the position changes', () => {
    const { result } = renderHook(() => useCoachPageState(), { wrapper: withRouter() })
    expect(result.current.hintLevel).toBe(0)

    for (let i = 0; i < 5; i += 1) act(() => result.current.revealHint())
    expect(result.current.hintLevel).toBe(result.current.maxHintLevel)

    act(() => result.current.game.move('e2', 'e4'))
    expect(result.current.hintLevel).toBe(0)
  })

  it('walks the replay and leaves it', () => {
    const { result } = renderHook(() => useCoachPageState(), { wrapper: withRouter() })
    act(() => result.current.game.move('e2', 'e4'))
    act(() => result.current.game.move('e7', 'e5'))

    act(() => result.current.enterReplay())
    expect(result.current.inReplay).toBe(true)
    expect(result.current.replayPly).toBe(result.current.lastPly)

    act(() => result.current.stepBack())
    expect(result.current.replayPly).toBe(result.current.lastPly - 1)

    act(() => result.current.goToStart())
    expect(result.current.replayPly).toBe(0)

    act(() => result.current.exitReplay())
    expect(result.current.inReplay).toBe(false)
  })

  it('opens a battle handed over from the router straight into replay', () => {
    const { result } = renderHook(() => useCoachPageState(), {
      wrapper: withRouter({
        pgn: '1. e4 e5 2. Nf3',
        playerColor: 'w',
        levelLabel: 'Intermédiaire',
        outcome: 'win',
        playedAt: '2026-09-01T00:00:00.000Z',
      }),
    })
    expect(result.current.game.sanHistory).toEqual(['e4', 'e5', 'Nf3'])
    expect(result.current.inReplay).toBe(true)
    expect(result.current.replayPly).toBe(0)
    expect(result.current.mode).toBe('game')
  })

  it('records a finished game once, with the reviewed side’s accuracy', async () => {
    const { result, rerender } = renderHook(() => useCoachPageState(), {
      wrapper: withRouter({
        pgn: foolsMatePgn,
        playerColor: 'w',
        levelLabel: 'Débutant',
        outcome: 'loss',
        playedAt: '2026-09-02T00:00:00.000Z',
      }),
    })
    // The handover loads the game; leave replay so the board is the live game.
    act(() => result.current.exitReplay())
    expect(result.current.game.status.isOver).toBe(true)

    const xpBefore = useProgressionStore.getState().xp
    act(() => {
      summary = { ...summary, isComplete: true, accuracyWhite: 42, accuracyBlack: 90 }
    })
    rerender()

    await waitFor(() =>
      expect(useProgressionStore.getState().xp).toBe(xpBefore + XP_REWARDS.coachGameAnalysed),
    )
    // White was the reviewed side, so its accuracy is the one that landed.
    expect(useProgressionStore.getState().stats.battleAccuracy).toBe(42)

    // The engine keeps refining the summary after it is complete, which re-runs
    // the recording effect. The same game must not be recorded a second time.
    act(() => {
      summary = { ...summary, accuracyWhite: 44 }
    })
    rerender()
    act(() => {
      summary = { ...summary, accuracyWhite: 45 }
    })
    rerender()
    expect(useProgressionStore.getState().xp).toBe(xpBefore + XP_REWARDS.coachGameAnalysed)
  })

  it('does not record while the analysis is still incomplete', () => {
    const { result } = renderHook(() => useCoachPageState(), {
      wrapper: withRouter({
        pgn: foolsMatePgn,
        playerColor: 'w',
        levelLabel: 'Débutant',
        outcome: 'loss',
      }),
    })
    act(() => result.current.exitReplay())
    expect(result.current.game.status.isOver).toBe(true)
    // summary.isComplete stays false — nothing recorded.
    expect(useProgressionStore.getState().xp).toBe(0)
  })
})
