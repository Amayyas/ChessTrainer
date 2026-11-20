import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ENDGAMES, GOAL_LABELS } from '@/features/puzzle/endgames'
import EndgamesView from '@/features/puzzle/EndgamesView'
import type { UseEndgameSession } from '@/features/puzzle/useEndgameSession'
import { useProgressionStore } from '@/store/useProgressionStore'

// The board needs a real browser; the view is checked around it.
vi.mock('@/components/Board', () => ({
  BoardControls: () => null,
  ChessBoard: ({ interactive }: { interactive: boolean }) => (
    <p>plateau {interactive ? 'actif' : 'figé'}</p>
  ),
  MoveInput: () => null,
}))

let session: Partial<UseEndgameSession>
vi.mock('@/features/puzzle/useEndgameSession', async (original) => ({
  ...(await original<typeof import('@/features/puzzle/useEndgameSession')>()),
  useEndgameSession: () => session,
}))

const game = {
  fen: ENDGAMES[0]!.fen,
  turn: 'w' as const,
  history: [],
  lastMove: null,
  checkSquare: null,
  status: { isOver: false, isCheck: false, reason: null, winner: null },
  getLegalTargets: () => [],
  isPromotion: () => false,
}

function playing(overrides: Partial<UseEndgameSession> = {}): Partial<UseEndgameSession> {
  return {
    game: game as unknown as UseEndgameSession['game'],
    player: 'w',
    status: 'playing',
    message: null,
    playerMoves: 0,
    isThinking: false,
    isEngineReady: true,
    playerMove: () => true,
    restart: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  useProgressionStore.getState().reset()
  session = playing()
})

describe('EndgamesView', () => {
  it('lists every endgame with its goal, and counts the ones mastered', () => {
    const first = ENDGAMES[0]!
    useProgressionStore.getState().setPuzzleProgress((progress) => ({
      ...progress,
      endgamesMastered: [first.id],
    }))
    render(<EndgamesView />)
    expect(screen.getAllByRole('listitem')).toHaveLength(ENDGAMES.length)
    expect(screen.getByText(new RegExp(`1 sur ${ENDGAMES.length} maîtrisée`))).toBeInTheDocument()
    const row = screen.getByRole('button', { name: new RegExp(first.title) })
    expect(row).toHaveTextContent(GOAL_LABELS[first.goal])
    expect(within(row).getByText('Maîtrisée')).toBeInTheDocument()
  })

  it('opens an endgame with its goal and its principle, and goes back to the list', async () => {
    const lucena = ENDGAMES.find((endgame) => endgame.id === 'lucena')!
    render(<EndgamesView />)
    await userEvent.click(screen.getByRole('button', { name: new RegExp(lucena.title) }))
    expect(screen.getByText(lucena.principle)).toBeInTheDocument()
    expect(screen.getByText(/Vous jouez les blancs\. Promouvez/)).toBeInTheDocument()
    expect(screen.getByText('plateau actif')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Toutes les finales' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(ENDGAMES.length)
  })

  it('freezes the board while the engine thinks', async () => {
    session = playing({ isThinking: true })
    render(<EndgamesView />)
    await userEvent.click(screen.getByRole('button', { name: new RegExp(ENDGAMES[0]!.title) }))
    expect(screen.getByText('plateau figé')).toBeInTheDocument()
  })

  it('counts the moves of a defence, then says how it ended', async () => {
    const philidor = ENDGAMES.find((endgame) => endgame.id === 'philidor')!
    session = playing({ player: 'b', playerMoves: 4 })
    const view = render(<EndgamesView />)
    await userEvent.click(screen.getByRole('button', { name: new RegExp(philidor.title) }))
    expect(screen.getByText(/Coups tenus : 4 \//)).toBeInTheDocument()

    session = playing({ status: 'won', message: '15 coups tenus : la défense est solide.' })
    view.rerender(<EndgamesView />)
    expect(screen.getByText('Finale maîtrisée')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejouer cette finale' })).toBeInTheDocument()
  })
})
