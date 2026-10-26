import { act, render, screen } from '@testing-library/react'
import type { Config } from '@lichess-org/chessground/config'
import type { Key } from '@lichess-org/chessground/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boardStyle } from '@/components/Board/boardTheme'
import HuntBoard, { type HuntBoardProps } from '@/features/hunt/HuntBoard'
import { huntPlacement, type EnemyType } from '@/features/hunt/board'
import { durations } from '@/lib/design-tokens'
import { useBoardStore } from '@/store/useBoardStore'
import { describeHunt, describeTaken } from '@/utils/describeBoard'

// chessground finds a square from the pointer's place on a measured board,
// which jsdom has not got: these tests check what the board tells chessground,
// and what it does with a square chessground reports clicked.
const ground = vi.hoisted(() => ({
  init: null as Config | null,
  sets: [] as Config[],
}))

vi.mock('@lichess-org/chessground', () => ({
  Chessground: (_element: HTMLElement, config: Config) => {
    ground.init = config
    return {
      set: (config: Config) => ground.sets.push(config),
      destroy: () => {},
    }
  },
}))

/** The board's state as chessground last heard it. */
function latest(): Config {
  return { ...ground.init, ...Object.assign({}, ...ground.sets) } as Config
}

/** A click on a square, as chessground reports it. */
function click(square: string) {
  act(() => ground.init!.events!.select!(square as Key))
}

// A spy rather than a stubbed global: unstubbing every global after each test
// also took away the ones src/test/setup.ts lays down for the file.
function stubReducedMotion(reduce: boolean) {
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

const ENEMIES = new Map<string, EnemyType>([
  ['e6', 'p'],
  ['b2', 'r'],
  ['f5', 'b'],
])

function renderBoard(props: Partial<HuntBoardProps> = {}) {
  const onMove = vi.fn()
  const view = render(
    <HuntBoard
      champion="n"
      championSquare="d4"
      enemies={ENEMIES}
      // The knight on d4: three empty squares and the pawn it could take.
      moves={['c6', 'e6', 'b5', 'f3']}
      threats={[]}
      onMove={onMove}
      {...props}
    />,
  )
  return { onMove, ...view }
}

beforeEach(() => {
  ground.init = null
  ground.sets = []
  useBoardStore.setState({ squares: 'hatched' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HuntBoard', () => {
  it('sets the enemies down in black and the champion in white', () => {
    renderBoard()
    expect(latest().fen).toBe(huntPlacement('n', 'd4', ENEMIES))
    expect(latest().fen).toBe('8/8/4p3/5b2/3N4/8/1r6/8')
  })

  it('dots the empty squares the champion reaches, and rings no enemy', () => {
    renderBoard()
    const marks = latest().highlight!.custom!
    expect(['c6', 'b5', 'f3'].map((square) => marks.get(square as Key))).toEqual([
      'hunt-reach',
      'hunt-reach',
      'hunt-reach',
    ])
    // e6 holds the pawn the knight could take: marking it would give it away.
    expect(marks.get('e6')).toBeUndefined()
  })

  it('marks the champion, and in the rubric the enemies that can take it', () => {
    renderBoard()
    expect(latest().highlight!.custom!.get('d4')).toBe('hunt-champion')

    ground.sets = []
    renderBoard({ threats: ['f5'] })
    const marks = latest().highlight!.custom!
    expect(marks.get('f5')).toBe('hunt-threat')
    expect(marks.get('d4')).toBe('hunt-champion hunt-danger')
  })

  it('leaves the champion off the board while it reappears', () => {
    renderBoard({ championSquare: null, moves: [] })
    expect(latest().fen).toBe('8/8/4p3/5b2/8/8/1r6/8')
    expect([...latest().highlight!.custom!.keys()]).toEqual([])
  })

  it('sends the champion to a square it reaches, at one click, and nowhere else', () => {
    const { onMove } = renderBoard()
    click('a1')
    expect(onMove).not.toHaveBeenCalled()
    click('c6')
    expect(onMove).toHaveBeenCalledWith('c6')
    // The pawn is taken at a click on it too: it is unmarked, not out of reach.
    click('e6')
    expect(onMove).toHaveBeenLastCalledWith('e6')
  })

  it('moves nothing when it is not interactive', () => {
    const { onMove } = renderBoard({ interactive: false })
    click('c6')
    expect(onMove).not.toHaveBeenCalled()
  })

  it('leaves the moving to the hunt: chessground moves no piece itself', () => {
    renderBoard()
    expect(ground.init?.movable?.color).toBeUndefined()
    expect(ground.init?.draggable?.enabled).toBe(false)
  })

  it('glides a piece for the time the tokens give it, and not under reduced motion', () => {
    stubReducedMotion(false)
    const { unmount } = renderBoard()
    expect(latest().animation).toEqual({ enabled: true, duration: durations.piece })
    unmount()

    stubReducedMotion(true)
    renderBoard()
    expect(latest().animation?.enabled).toBe(false)
  })

  it('draws the squares the player chose', () => {
    useBoardStore.setState({ squares: 'plain' })
    const { container } = renderBoard()
    const frame = container.querySelector('.cg-wrap')!.parentElement as HTMLElement
    expect(frame.style.getPropertyValue('--board-squares')).toBe(
      (boardStyle('plain', false) as Record<string, string>)['--board-squares'],
    )
  })

  it('describes the round to assistive technology', () => {
    renderBoard({ threats: ['f5'] })
    expect(screen.getByRole('img', { name: 'Échiquier' })).toHaveAccessibleDescription(
      describeHunt('n', 'd4', ENEMIES, ['f5']),
    )
  })

  it('says the danger the moment it comes, and again on each square it follows', () => {
    const { container, rerender } = renderBoard()
    const alert = () => container.querySelector('[aria-live="assertive"]')!.textContent
    expect(alert()).toBe('')

    const board = (championSquare: string, threats: string[]) => (
      <HuntBoard
        champion="n"
        championSquare={championSquare}
        enemies={ENEMIES}
        moves={[]}
        threats={threats}
        onMove={() => {}}
      />
    )
    rerender(board('d4', ['f5']))
    const first = alert()
    expect(first).toMatch(/^En danger : Fou f5 peut vous prendre\.\s?$/)
    // Another render of the same round says nothing new.
    rerender(board('d4', ['f5']))
    expect(alert()).toBe(first)

    // Moved, and the same bishop still aims at it: the same words, told apart
    // by a space the reader does not say, or they would go unsaid.
    rerender(board('e4', ['f5']))
    expect(alert()).toMatch(/^En danger : Fou f5 peut vous prendre\.\s?$/)
    expect(alert()).not.toBe(first)

    rerender(board('c4', []))
    expect(alert()).toBe('')
  })

  it('says the champion taken the moment it is', () => {
    const { container, rerender } = renderBoard({ threats: ['f5'] })
    rerender(
      <HuntBoard
        champion="n"
        championSquare={null}
        enemies={ENEMIES}
        moves={[]}
        threats={[]}
        onMove={() => {}}
      />,
    )
    expect(container.querySelector('[aria-live="assertive"]')).toHaveTextContent(describeTaken('n'))
  })

  it('leaves the stand-ins the test setup lays down in place', () => {
    // Last, on purpose: it reads what the tests before it left behind.
    expect(window.matchMedia).toBeTypeOf('function')
    expect(globalThis.ResizeObserver).toBeTypeOf('function')
  })
})
