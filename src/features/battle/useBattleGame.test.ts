import { act, renderHook } from '@testing-library/react'
import { Chess } from 'chess.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLevel, type LevelId } from '@/engine/levels'
import type { Analysis } from '@/engine/stockfishEngine'
import {
  MAX_ENGINE_FAILURES,
  useBattleGame,
  type BattleConfig,
  type UseBattleGame,
} from '@/features/battle/useBattleGame'
import { getTimeControl } from '@/hooks/useChessClock'

/**
 * The battle mode had no tests at all, and this hook is the whole mode: the
 * setup / playing / over machine, the engine reply fired from a timer, and the
 * verdict with the sentence the player reads.
 *
 * Stockfish is replaced by a scripted line, so every game here is deterministic.
 * The clock and the chess state are the real hooks: what is worth covering is
 * how the three are wired together, and a fake clock would cover none of it.
 */

/** Position (FEN) → the move the scripted line plays there, in UCI. */
const engineMoves = new Map<string, string>()

/** Searches to answer with nothing before the script takes over. */
let refusals = 0
/** Searches to answer with a move the position cannot play. */
let illegalAnswers = 0

const analyze = vi.fn(async (fen: string): Promise<Analysis | null> => {
  if (refusals > 0) {
    refusals -= 1
    return null
  }
  if (illegalAnswers > 0) {
    illegalAnswers -= 1
    // A rook on a1 with its own pieces around it: parseable, and not legal.
    return { bestMove: 'a1a8', scoreCp: 0, scoreMate: null, depth: 5, pv: [] }
  }
  const bestMove = engineMoves.get(fen)
  if (!bestMove) return null
  return { bestMove, scoreCp: 0, scoreMate: null, depth: 5, pv: [] }
})
const configureLevel = vi.fn(async () => {})

// `analyze` and `configureLevel` are handed over by reference, as the real hook
// does through useCallback. A fresh closure per render would restart the engine
// effect on every render and hide whatever the effect's own dependencies do.
vi.mock('@/engine/useStockfish', () => ({
  useStockfish: () => ({ isReady: true, isAnalyzing: false, analyze, configureLevel }),
}))

/**
 * Scripts a whole game from the start position.
 *
 * Keyed on the position rather than queued: the engine then answers the same
 * way however many times it is asked, so a position searched twice shows up as
 * a repeated call instead of desynchronising the line and failing elsewhere.
 */
function scriptLine(line: string[]): void {
  const chess = new Chess()
  for (const san of line) {
    const before = chess.fen()
    const move = chess.move(san)
    engineMoves.set(before, `${move.from}${move.to}${move.promotion ?? ''}`)
  }
}

/** 1. f3 e5 2. g4 Qh4# — the shortest mate, playable from either side. */
const FOOLS_MATE = ['f3', 'e5', 'g4', 'Qh4#']

/** Knights out and back, twice: the start position occurs three times. */
const SHUFFLE = ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']

const LEVEL: LevelId = 1

type Battle = { current: UseBattleGame }

function startGame(battle: Battle, config: Partial<BattleConfig> = {}): void {
  act(() =>
    battle.current.start({
      levelId: LEVEL,
      colorChoice: 'white',
      timeControlId: 'unlimited',
      ...config,
    }),
  )
}

function playerPlays(battle: Battle, san: string): boolean {
  const probe = new Chess(battle.current.game.fen)
  const move = probe.move(san)
  let applied = false
  act(() => {
    applied = battle.current.playerMove(move.from, move.to, move.promotion)
  })
  return applied
}

/** Waits out the level's think time, then flushes the analysis promise. */
async function letEngineThink(levelId: LevelId = LEVEL): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(getLevel(levelId).maxDelayMs + 1)
  })
}

describe('useBattleGame before a game starts', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits on the setup screen with nothing decided', () => {
    const { result } = renderHook(() => useBattleGame())
    expect(result.current.phase).toBe('setup')
    expect(result.current.result).toBeNull()
    expect(result.current.game.sanHistory).toEqual([])
  })

  it('ignores a resignation there', () => {
    const { result } = renderHook(() => useBattleGame())
    act(() => result.current.resign())
    expect(result.current.phase).toBe('setup')
    expect(result.current.result).toBeNull()
  })

  it('refuses a move there', () => {
    const { result } = renderHook(() => useBattleGame())
    expect(playerPlays(result, 'e4')).toBe(false)
    expect(result.current.game.sanHistory).toEqual([])
  })
})

describe('useBattleGame starting a game', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    engineMoves.clear()
    refusals = 0
    illegalAnswers = 0
    analyze.mockClear()
    configureLevel.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('gives the player the colour they chose', () => {
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    expect(result.current.phase).toBe('playing')
    expect(result.current.playerColor).toBe('b')

    act(() => result.current.backToSetup())
    startGame(result, { colorChoice: 'white' })
    expect(result.current.playerColor).toBe('w')
  })

  it('calibrates the engine to the level the player picked', () => {
    const { result } = renderHook(() => useBattleGame())
    const level: LevelId = 6

    startGame(result, { levelId: level })

    expect(result.current.level).toEqual(getLevel(level))
    expect(configureLevel).toHaveBeenLastCalledWith(getLevel(level))
  })

  // Only the board and the verdict. The clock and the position the engine is
  // searching are cleared by backToSetup, not by start — which is safe only
  // because the setup screen is the sole way back here. A "Rejouer" button on
  // the over screen would call start directly and inherit both.
  it('clears the board and the verdict of the game before it', () => {
    scriptLine(['e4'])
    const { result } = renderHook(() => useBattleGame())

    startGame(result)
    playerPlays(result, 'e4')
    act(() => result.current.resign())
    expect(result.current.result).not.toBeNull()

    startGame(result)
    expect(result.current.result).toBeNull()
    expect(result.current.game.sanHistory).toEqual([])
  })
})

describe('useBattleGame and the engine reply', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    engineMoves.clear()
    refusals = 0
    illegalAnswers = 0
    analyze.mockClear()
    configureLevel.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('answers only after the level has thought about it', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    expect(result.current.isThinking).toBe(true)

    // Not before the level's own minimum: an instant reply is the tell that the
    // simulated think time has been bypassed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(getLevel(LEVEL).minDelayMs - 1)
    })
    expect(result.current.game.sanHistory).toEqual([])

    await letEngineThink()
    expect(result.current.isThinking).toBe(false)
    expect(result.current.game.sanHistory).toEqual(['f3'])
  })

  it('waits for the player rather than answering itself', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'white' })
    await letEngineThink()

    expect(analyze).not.toHaveBeenCalled()
    expect(result.current.game.sanHistory).toEqual([])
  })

  it('refuses to move for the player on the engine’s turn', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())
    startGame(result, { colorChoice: 'black' })

    // e4 is legal on the board — it is simply not the player's to play.
    expect(playerPlays(result, 'e4')).toBe(false)
    expect(result.current.game.sanHistory).toEqual([])
  })

  it('keeps searching while the clock ticks under it', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())

    // A running clock re-renders this hook ten times a second. The search is
    // scheduled once and must survive every one of them: an effect that
    // restarted on each tick would clear its own timer and never fire.
    startGame(result, { colorChoice: 'black', timeControlId: 'blitz' })
    await letEngineThink()

    expect(result.current.game.sanHistory).toEqual(['f3'])
    expect(analyze).toHaveBeenCalledTimes(1)
  })

  /*
   * A limit of the count above, found by deleting the code it covers: removing
   * the `thinkingFor` guard from the hook leaves every test in this file green.
   * With useStockfish handing back a stable `analyze`, nothing re-runs that
   * effect while a search is pending, so the guard turns nothing away.
   *
   * What the ref does buy is the repeat two describes down — two games from the
   * same starting position — and deleting the line that clears it there does go
   * red. Guard and reset are load-bearing as a pair, not separately.
   */

  it('hands the clock over on both sides of a move', async () => {
    scriptLine(['e4', 'e5'])
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { timeControlId: 'blitz' })
    expect(result.current.clock.active).toBe('w')

    expect(playerPlays(result, 'e4')).toBe(true)
    expect(result.current.clock.active).toBe('b')

    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual(['e4', 'e5'])
    expect(result.current.clock.active).toBe('w')
  })
})

describe('useBattleGame verdicts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    engineMoves.clear()
    refusals = 0
    illegalAnswers = 0
    analyze.mockClear()
    configureLevel.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('calls a mate delivered by the player a win', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    await letEngineThink()
    playerPlays(result, 'e5')
    await letEngineThink()
    playerPlays(result, 'Qh4#')

    expect(result.current.phase).toBe('over')
    expect(result.current.result).toEqual({
      outcome: 'win',
      label: 'Échec et mat — vous gagnez !',
    })
  })

  it('calls the same mate delivered by the engine a loss', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'white' })
    playerPlays(result, 'f3')
    await letEngineThink()
    playerPlays(result, 'g4')
    await letEngineThink()

    expect(result.current.phase).toBe('over')
    expect(result.current.result).toEqual({
      outcome: 'loss',
      label: "Échec et mat — l'IA gagne.",
    })
  })

  it('calls a repeated position a draw', async () => {
    scriptLine(SHUFFLE)
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'white' })
    for (const san of ['Nf3', 'Ng1', 'Nf3', 'Ng1']) {
      playerPlays(result, san)
      await letEngineThink()
    }

    expect(result.current.game.status.reason).toBe('threefold')
    expect(result.current.phase).toBe('over')
    expect(result.current.result).toEqual({ outcome: 'draw', label: 'Partie nulle.' })
  })

  it('calls the player’s flag a loss on time', async () => {
    const bullet = getTimeControl('bullet')
    const { result } = renderHook(() => useBattleGame())

    // The player is White and to move, so the clock runs on their side alone.
    startGame(result, { timeControlId: 'bullet' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(bullet.initialMs + 1_000)
    })

    expect(result.current.phase).toBe('over')
    expect(result.current.result).toEqual({
      outcome: 'loss',
      label: 'Temps écoulé — vous perdez.',
    })
  })

  it('calls a resignation a loss', () => {
    const { result } = renderHook(() => useBattleGame())

    startGame(result)
    act(() => result.current.resign())

    expect(result.current.phase).toBe('over')
    expect(result.current.result).toEqual({ outcome: 'loss', label: 'Vous avez abandonné.' })
  })
})

describe('useBattleGame when the engine will not answer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    engineMoves.clear()
    refusals = 0
    illegalAnswers = 0
    analyze.mockClear()
    configureLevel.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('asks again after a search that came back with nothing', async () => {
    scriptLine(FOOLS_MATE)
    refusals = 1
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual([])
    expect(result.current.isEngineStalled).toBe(false)

    // A failure is usually transient, so the position is searched again.
    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual(['f3'])
    expect(analyze).toHaveBeenCalledTimes(2)
  })

  it('counts a move the position cannot play as no answer at all', async () => {
    scriptLine(FOOLS_MATE)
    illegalAnswers = 1
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual([])

    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual(['f3'])
  })

  it('gives up rather than leaving the player at a board that cannot move', async () => {
    // Nothing is scripted, so every search comes back empty. Before the count
    // existed the first one pinned the position for good: no move, no retry,
    // no way forward but to resign a game the engine never played.
    const { result } = renderHook(() => useBattleGame())
    startGame(result, { colorChoice: 'black' })

    for (let attempt = 0; attempt < MAX_ENGINE_FAILURES; attempt += 1) await letEngineThink()

    expect(result.current.isEngineStalled).toBe(true)
    expect(result.current.isThinking).toBe(false)
    expect(analyze).toHaveBeenCalledTimes(MAX_ENGINE_FAILURES)

    // And it stops asking, rather than retrying for as long as the tab is open.
    await letEngineThink()
    expect(analyze).toHaveBeenCalledTimes(MAX_ENGINE_FAILURES)
  })

  it('starts the next game with a clean count', async () => {
    const { result } = renderHook(() => useBattleGame())
    startGame(result, { colorChoice: 'black' })
    for (let attempt = 0; attempt < MAX_ENGINE_FAILURES; attempt += 1) await letEngineThink()
    expect(result.current.isEngineStalled).toBe(true)

    act(() => result.current.backToSetup())
    scriptLine(FOOLS_MATE)
    startGame(result, { colorChoice: 'black' })
    await letEngineThink()

    expect(result.current.isEngineStalled).toBe(false)
    expect(result.current.game.sanHistory).toEqual(['f3'])
  })

  it('forgets earlier failures once the engine answers again', async () => {
    // The count is consecutive failures, not failures for the life of the game:
    // an engine that hiccups twice early on must still get its full allowance
    // later, rather than stalling on its third bad moment of the afternoon.
    scriptLine(FOOLS_MATE)
    refusals = MAX_ENGINE_FAILURES - 1
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    for (let attempt = 0; attempt < MAX_ENGINE_FAILURES; attempt += 1) await letEngineThink()
    expect(result.current.game.sanHistory).toEqual(['f3'])
    expect(result.current.isEngineStalled).toBe(false)

    playerPlays(result, 'e5')
    refusals = MAX_ENGINE_FAILURES - 1
    for (let attempt = 0; attempt < MAX_ENGINE_FAILURES; attempt += 1) await letEngineThink()

    expect(result.current.game.sanHistory).toEqual(['f3', 'e5', 'g4'])
    expect(result.current.isEngineStalled).toBe(false)
  })
})

describe('useBattleGame going back for another game', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    engineMoves.clear()
    refusals = 0
    illegalAnswers = 0
    analyze.mockClear()
    configureLevel.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('lets the engine open the second game as it opened the first', async () => {
    scriptLine(FOOLS_MATE)
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { colorChoice: 'black' })
    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual(['f3'])

    act(() => result.current.backToSetup())
    expect(result.current.phase).toBe('setup')
    expect(result.current.result).toBeNull()

    // The second game starts from the position the first one did. The hook
    // remembers which position it is already thinking about, and unless that
    // memory is cleared here the opening move never comes.
    startGame(result, { colorChoice: 'black' })
    await letEngineThink()
    expect(result.current.game.sanHistory).toEqual(['f3'])
  })

  it('puts the clock back to full time', async () => {
    const blitz = getTimeControl('blitz')
    const { result } = renderHook(() => useBattleGame())

    startGame(result, { timeControlId: 'blitz' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(result.current.clock.whiteMs).toBeLessThan(blitz.initialMs)

    act(() => result.current.backToSetup())
    expect(result.current.clock.whiteMs).toBe(blitz.initialMs)
    expect(result.current.clock.active).toBeNull()
  })
})
