import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Config } from '@lichess-org/chessground/config'
import type { Key, MoveMetadata } from '@lichess-org/chessground/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChessBoard from '@/components/Board/ChessBoard'
import { boardStyle } from '@/components/Board/boardTheme'
import { useChessGame } from '@/hooks/useChessGame'
import { board, durations } from '@/lib/design-tokens'
import { useBoardStore } from '@/store/useBoardStore'
import type { PieceSymbol, Square } from '@/utils/chess'

// chessground finds a square from the pointer's place on a measured board,
// which jsdom has not got. These tests check what the board tells chessground
// and what it does with the moves chessground hands back; moving a piece with
// the pointer is the smoke tests' to check, in a browser.
const ground = vi.hoisted(() => ({
  init: null as Config | null,
  sets: [] as Config[],
  /** What chessground holds: what it was made with, each set merged in. */
  state: {} as { fen?: string; turnColor?: string; dests?: Map<Key, Key[]> },
}))

vi.mock('@lichess-org/chessground', () => ({
  Chessground: (_element: HTMLElement, config: Config) => {
    ground.init = config
    ground.state = { fen: config.fen, turnColor: config.turnColor, dests: config.movable?.dests }
    return {
      set: (config: Config) => {
        ground.sets.push(config)
        if (config.fen !== undefined) ground.state.fen = config.fen
        if (config.turnColor !== undefined) ground.state.turnColor = config.turnColor
        if (config.movable && 'dests' in config.movable) ground.state.dests = config.movable.dests
      },
      selectSquare: () => {},
      destroy: () => {},
    }
  },
}))

/** The board's state as chessground last heard it. */
function latest(): Config {
  return { ...ground.init, ...Object.assign({}, ...ground.sets) } as Config
}

/**
 * A move made on the board, as chessground makes it: the turn passes and the
 * moves it allowed are dropped, and only then is the board told.
 */
function moveOnBoard(from: string, to: string) {
  ground.state.turnColor = ground.state.turnColor === 'white' ? 'black' : 'white'
  ground.state.dests = undefined
  act(() => ground.init!.movable!.events!.after!(from as Key, to as Key, {} as MoveMetadata))
}

/** chessground holds the position, and a piece of the side to move can be picked up. */
function playable(fen: string, side: 'white' | 'black', square: string, targets: string[]) {
  expect(ground.state.fen).toBe(fen)
  expect(ground.state.turnColor).toBe(side)
  expect(ground.state.dests?.get(square as Key)).toEqual(targets)
}

function Harness({
  fen,
  interactive = true,
  refuse = false,
  arrows,
}: {
  fen?: string
  interactive?: boolean
  refuse?: boolean
  arrows?: Array<[Square, Square]>
}) {
  const game = useChessGame(fen)
  return (
    <div>
      <ChessBoard
        fen={game.fen}
        turn={game.turn}
        interactive={interactive}
        onMove={(from, to, promotion?: PieceSymbol) =>
          !refuse && game.move(from, to, promotion) !== null
        }
        getLegalTargets={game.getLegalTargets}
        isPromotion={game.isPromotion}
        lastMove={game.lastMove}
        checkSquare={game.checkSquare}
        arrows={arrows}
      />
      <p data-testid="history">{game.sanHistory.join(' ')}</p>
    </div>
  )
}

function reduceMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media: string) =>
      ({
        matches: media === '(prefers-reduced-motion: reduce)' ? reduce : false,
        media,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

beforeEach(() => {
  ground.init = null
  ground.sets = []
  useBoardStore.setState({ squares: 'hatched' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChessBoard', () => {
  it('tells chessground which pieces may move, and where', () => {
    render(<Harness />)
    const { movable } = latest()
    expect(movable?.color).toBe('white')
    expect(movable?.dests?.get('e2')).toEqual(['e3', 'e4'])
    expect(movable?.dests?.get('g1')).toEqual(['f3', 'h3'])
    // Twenty moves from ten pieces, and nothing for the side not to move.
    expect([...movable!.dests!.values()].flat()).toHaveLength(20)
    expect(movable?.dests?.has('e7')).toBe(false)
  })

  it('plays the move chessground hands back, then shows the new position', () => {
    render(<Harness />)
    moveOnBoard('e2', 'e4')
    expect(screen.getByTestId('history')).toHaveTextContent('e4')
    const after = latest()
    expect(after.lastMove).toEqual(['e2', 'e4'])
    expect(after.turnColor).toBe('black')
    expect(after.movable?.dests?.get('e7')).toEqual(['e6', 'e5'])
  })

  it('puts back a move the game refuses, the turn and the moves with it', () => {
    render(<Harness refuse />)
    const start = latest().fen!
    moveOnBoard('e2', 'e4')
    expect(screen.getByTestId('history')).toHaveTextContent('')
    playable(start, 'white', 'e2', ['e3', 'e4'])
  })

  it('moves nothing when it is not interactive', () => {
    render(<Harness interactive={false} />)
    const { movable, draggable, selectable } = latest()
    expect(movable?.color).toBeUndefined()
    expect(movable?.dests?.size).toBe(0)
    expect(draggable?.enabled).toBe(false)
    expect(selectable?.enabled).toBe(false)
  })

  it('binds no pointer events to a diagram', () => {
    render(
      <ChessBoard
        diagram
        fen="8/8/8/8/8/8/8/K6k w - - 0 1"
        turn="w"
        onMove={() => false}
        getLegalTargets={() => []}
        isPromotion={() => false}
      />,
    )
    expect(ground.init?.viewOnly).toBe(true)
  })

  it('asks which piece a pawn becomes, and plays the choice', () => {
    render(<Harness fen="8/4P3/8/8/8/8/k7/4K3 w - - 0 1" />)
    moveOnBoard('e7', 'e8')
    const choice = screen.getByRole('group', { name: 'Promotion : choisissez une pièce' })
    expect(screen.getByRole('button', { name: 'Dame' })).toHaveFocus()
    expect(choice).toContainElement(screen.getByRole('button', { name: 'Cavalier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cavalier' }))
    expect(screen.getByTestId('history')).toHaveTextContent('e8=N')
    expect(screen.queryByRole('group', { name: /Promotion/ })).not.toBeInTheDocument()
  })

  it('takes the pawn back when the choice is dismissed, and leaves the board playable', () => {
    render(<Harness fen="8/4P3/8/8/8/8/k7/4K3 w - - 0 1" />)
    moveOnBoard('e7', 'e8')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dame' }), { key: 'Escape' })
    expect(screen.queryByRole('group', { name: /Promotion/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('history')).toHaveTextContent('')
    playable('8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'white', 'e7', ['e8'])
  })

  it('takes the pawn back when the game refuses the piece chosen', () => {
    render(<Harness refuse fen="8/4P3/8/8/8/8/k7/4K3 w - - 0 1" />)
    moveOnBoard('e7', 'e8')
    fireEvent.click(screen.getByRole('button', { name: 'Cavalier' }))
    expect(screen.getByTestId('history')).toHaveTextContent('')
    playable('8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'white', 'e7', ['e8'])
  })

  it('glides a piece for the time the tokens give it, and not at all under reduced motion', () => {
    reduceMotion(false)
    const { unmount } = render(<Harness />)
    expect(latest().animation).toEqual({ enabled: true, duration: durations.piece })
    unmount()

    reduceMotion(true)
    render(<Harness />)
    expect(latest().animation?.enabled).toBe(false)
  })

  it('draws the coach’s arrow with the rubric brush', () => {
    render(<Harness arrows={[['g1', 'f3']]} />)
    expect(latest().drawable?.autoShapes).toEqual([{ orig: 'g1', dest: 'f3', brush: 'coach' }])
    expect(ground.init?.drawable?.brushes?.coach).toMatchObject({
      color: board.arrow.colour,
      opacity: board.arrow.opacity,
    })
  })

  it('marks the last move and a king in check', () => {
    // After 1.e4 f6 2.d4 g5 3.Qh5+: the black king is in check.
    render(<Harness fen="rnbqkbnr/ppppp2p/5p2/6pQ/3PP3/8/PPP2PPP/RNB1KBNR b KQkq - 1 3" />)
    expect(latest().check).toBe(true)
  })

  it('draws the squares the player chose, and a diagram always hatched', () => {
    const squaresOf = (container: HTMLElement) =>
      (container.querySelector('.cg-wrap')!.parentElement as HTMLElement).style.getPropertyValue(
        '--board-squares',
      )
    const drawn = (variant: 'hatched' | 'plain') =>
      (boardStyle(variant, false) as Record<string, string>)['--board-squares']

    useBoardStore.setState({ squares: 'plain' })
    const played = render(<Harness />)
    expect(squaresOf(played.container)).toBe(drawn('plain'))
    played.unmount()

    const diagram = render(
      <ChessBoard
        diagram
        fen="8/8/8/8/8/8/8/K6k w - - 0 1"
        turn="w"
        onMove={() => false}
        getLegalTargets={() => []}
        isPromotion={() => false}
      />,
    )
    expect(squaresOf(diagram.container)).toBe(drawn('hatched'))
  })

  it('hands chessground nothing new when a render brings the same position', () => {
    // A page may build the last move and the arrows anew at each render, as
    // the coach's replay does: equal values are the same board.
    const props = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      turn: 'b' as const,
      onMove: () => false,
      getLegalTargets: () => [],
      isPromotion: () => false,
    }
    const { rerender } = render(
      <ChessBoard {...props} lastMove={{ from: 'e2', to: 'e4' }} arrows={[['g8', 'f6']]} />,
    )
    const before = ground.sets.length
    rerender(<ChessBoard {...props} lastMove={{ from: 'e2', to: 'e4' }} arrows={[['g8', 'f6']]} />)
    expect(ground.sets).toHaveLength(before)

    // The control: another arrow is another board.
    rerender(<ChessBoard {...props} lastMove={{ from: 'e2', to: 'e4' }} arrows={[['b8', 'c6']]} />)
    expect(ground.sets).toHaveLength(before + 1)
    expect(latest().drawable?.autoShapes).toEqual([{ orig: 'b8', dest: 'c6', brush: 'coach' }])
  })

  it('closes the promotion choice when the board stops taking moves', () => {
    const { rerender } = render(<Harness fen="8/4P3/8/8/8/8/k7/4K3 w - - 0 1" />)
    moveOnBoard('e7', 'e8')
    expect(screen.getByRole('group', { name: /Promotion/ })).toBeInTheDocument()
    rerender(<Harness fen="8/4P3/8/8/8/8/k7/4K3 w - - 0 1" interactive={false} />)
    expect(screen.queryByRole('group', { name: /Promotion/ })).not.toBeInTheDocument()
  })

  it('sets the coordinates outside the frame, turned with the board', () => {
    const { container, rerender } = render(
      <ChessBoard
        fen="8/8/8/8/8/8/8/K6k w - - 0 1"
        turn="w"
        onMove={() => false}
        getLegalTargets={() => []}
        isPromotion={() => false}
      />,
    )
    const coordinates = () => [...container.querySelectorAll('ol')].map((list) => list.textContent)
    expect(coordinates()).toEqual(['87654321', 'abcdefgh'])

    rerender(
      <ChessBoard
        orientation="black"
        fen="8/8/8/8/8/8/8/K6k w - - 0 1"
        turn="w"
        onMove={() => false}
        getLegalTargets={() => []}
        isPromotion={() => false}
      />,
    )
    expect(coordinates()).toEqual(['12345678', 'hgfedcba'])
  })
})
