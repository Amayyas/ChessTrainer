import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, type MistakePuzzle } from '@/features/puzzle/mistakes'
import { dayKey } from '@/features/puzzle/progress'
import MistakesView from '@/features/puzzle/MistakesView'
import { useProgressionStore } from '@/store/useProgressionStore'
import { FIGURINES } from '@/utils/notation'

vi.mock('@/components/Board', () => ({
  BoardControls: () => null,
  ChessBoard: () => <p>plateau</p>,
  MoveInput: () => null,
}))
vi.mock('@/engine/useStockfish', () => ({
  useStockfish: () => ({
    isReady: true,
    isAnalyzing: false,
    analyze: vi.fn(),
    configureLevel: vi.fn(),
  }),
}))

const puzzle = (id: string, overrides: Partial<MistakePuzzle> = {}): MistakePuzzle => ({
  id,
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
  best: 'g7g6',
  bestEval: { cp: 120, mate: null },
  played: 'Nf6',
  createdAt: '2026-11-20T10:00:00.000Z',
  due: dayKey(),
  streak: 0,
  ...overrides,
})

function hold(mistakes: MistakePuzzle[]) {
  useProgressionStore.getState().setPuzzleProgress((p) => ({ ...p, mistakes }))
}

beforeEach(() => useProgressionStore.getState().reset())

describe('MistakesView', () => {
  it('explains where mistakes come from before there are any', () => {
    render(<MistakesView />)
    expect(screen.getByText(/Les erreurs et les gaffes que le Coach relève/)).toBeInTheDocument()
  })

  it('says when the next one is due when none is due today', () => {
    hold([puzzle('later', { due: addDays(dayKey(), 3) })])
    render(<MistakesView />)
    expect(screen.getByText(/Rien à revoir aujourd’hui/)).toBeInTheDocument()
    expect(screen.getByText(/0 à revoir aujourd’hui, 1 en tout/)).toBeInTheDocument()
  })

  it('sets a due mistake with the move that was played', () => {
    hold([puzzle('now')])
    render(<MistakesView />)
    expect(screen.getByText('plateau')).toBeInTheDocument()
    expect(screen.getByText(/vous aviez joué 3…/)).toHaveTextContent(`${FIGURINES.N}`)
  })

  it('leaves out an entry whose move is not legal in its position', () => {
    hold([puzzle('broken', { best: 'a1a8' })])
    render(<MistakesView />)
    expect(screen.queryByText('plateau')).not.toBeInTheDocument()
  })

  it('keeps the answered mistake on the board, for its verdict, until the next is asked for', () => {
    const first = puzzle('first', { played: 'Nf6' })
    const second = puzzle('second', {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
      best: 'e2e4',
      played: 'g4',
    })
    hold([first, second])
    render(<MistakesView />)
    expect(screen.getByText(/vous aviez joué 3…/)).toBeInTheDocument()

    // Answering reschedules it off today's list.
    act(() => hold([{ ...first, due: addDays(dayKey(), 3), streak: 1 }, second]))
    expect(screen.getByText(/vous aviez joué 3…/)).toBeInTheDocument()
    expect(screen.queryByText(/vous aviez joué 2\./)).not.toBeInTheDocument()
  })
})
