import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENGINE_LEVELS } from '@/engine/levels'
import BattlePage from '@/features/battle/BattlePage'
import type { UseBattleGame } from '@/features/battle/useBattleGame'

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
