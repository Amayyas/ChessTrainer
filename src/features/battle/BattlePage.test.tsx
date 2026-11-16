import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENGINE_LEVELS } from '@/engine/levels'
import BattlePage from '@/features/battle/BattlePage'
import type { UseBattleGame } from '@/features/battle/useBattleGame'
import { ROUTES } from '@/routes'
import { useProgressionStore } from '@/store/useProgressionStore'

// The board and the move list are not what is under test, and the board pulls
// in chessground; the page is checked around them.
vi.mock('@/components/Board', () => ({
  BoardControls: () => null,
  ChessBoard: () => null,
  MoveHistory: () => null,
  MoveInput: () => null,
}))

let battle: UseBattleGame
vi.mock('@/features/battle/useBattleGame', () => ({ useBattleGame: () => battle }))

function playing(overrides: Partial<UseBattleGame> = {}): UseBattleGame {
  return {
    phase: 'playing',
    game: {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      turn: 'b',
      history: [],
      sanHistory: ['e4'],
      lastMove: null,
      status: { isOver: false, isCheck: false, reason: null, winner: null },
      checkSquare: null,
      move: () => null,
      getLegalTargets: () => [],
      isPromotion: () => false,
      undo: () => {},
      reset: () => {},
      pgn: '',
      loadPgn: () => true,
    },
    clock: {
      enabled: false,
      whiteMs: 0,
      blackMs: 0,
      active: null,
      flagged: null,
      start: () => {},
      stop: () => {},
      reset: () => {},
      press: () => {},
    },
    level: ENGINE_LEVELS[0]!,
    playerColor: 'w',
    isThinking: false,
    isEngineReady: true,
    isEngineStalled: false,
    result: null,
    start: () => {},
    playerMove: () => false,
    resign: () => {},
    backToSetup: () => {},
    ...overrides,
  } as UseBattleGame
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BattlePage />
    </MemoryRouter>,
  )
}

describe('BattlePage', () => {
  beforeEach(() => {
    battle = playing()
  })

  it('says in its live status line when the engine stops answering', () => {
    // The header swapped its status line for a tag when the engine stalled. A
    // live region is heard when its words change, not when it is taken away,
    // so the one state that needed acting on was the one left unsaid.
    const { rerender } = renderPage()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Trait aux noirs')

    battle = playing({ isEngineStalled: true })
    rerender(
      <MemoryRouter>
        <BattlePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent("L'IA ne répond plus")
  })

  it('says the engine is thinking in the same line', () => {
    const { rerender } = renderPage()
    const status = screen.getByRole('status')

    battle = playing({ isThinking: true })
    rerender(
      <MemoryRouter>
        <BattlePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent("L'IA réfléchit…")
  })
})

describe('BattlePage with a game taken up from the coach', () => {
  const resume = {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    color: 'b',
    san: 'Nf6',
  }
  const won = { outcome: 'win' as const, label: 'Échec et mat — vous gagnez !' }
  const recordBattle = vi.fn()

  /** Where "Analyser dans le Coach" lands, showing the state it was handed. */
  function CoachProbe() {
    return <pre data-testid="handed-over">{JSON.stringify(useLocation().state)}</pre>
  }

  function page(state?: unknown) {
    return (
      <MemoryRouter initialEntries={[{ pathname: ROUTES.battle, state }]}>
        <Routes>
          <Route path={ROUTES.battle} element={<BattlePage />} />
          <Route path={ROUTES.coach} element={<CoachProbe />} />
        </Routes>
      </MemoryRouter>
    )
  }

  /** Starts from the setup screen, then ends the game with a win. */
  async function playToAWin(state?: unknown) {
    const start = vi.fn()
    battle = playing({ phase: 'setup', start })
    const view = render(page(state))
    await userEvent.click(
      screen.getByRole('button', { name: /Reprendre la partie|Commencer la partie/ }),
    )
    battle = playing({ phase: 'over', result: won, game: { ...playing().game, pgn: '1. e4 *' } })
    view.rerender(page(state))
    return start
  }

  beforeEach(() => {
    recordBattle.mockClear()
    useProgressionStore.setState({ recordBattle })
  })

  it('counts a game played from the opening position', async () => {
    await playToAWin()
    expect(recordBattle).toHaveBeenCalledOnce()
  })

  it('does not ask for a colour it will not let the player choose', () => {
    battle = playing({ phase: 'setup' })
    render(page({ resume }))
    expect(screen.queryByText(/votre couleur/)).not.toBeInTheDocument()
    expect(screen.getByText(/reprenez la partie/)).toBeInTheDocument()
  })

  it('counts nothing for a game taken up from a position', async () => {
    const start = await playToAWin({ resume })
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ startFen: resume.fen }))
    expect(recordBattle).not.toHaveBeenCalled()
  })

  it('hands a resumed game to the coach as practice, not as a battle played', async () => {
    await playToAWin({ resume })
    await userEvent.click(screen.getByRole('button', { name: 'Analyser dans le Coach' }))
    const handed = JSON.parse(screen.getByTestId('handed-over').textContent!)
    expect(handed).not.toHaveProperty('outcome')
    expect(handed).not.toHaveProperty('levelLabel')
    expect(handed).toHaveProperty('levelId')
  })
})
