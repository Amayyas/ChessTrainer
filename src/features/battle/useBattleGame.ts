import { useCallback, useEffect, useRef, useState } from 'react'
import { getLevel, thinkingDelay, type EngineLevel, type LevelId } from '@/engine/levels'
import { parseUciMove } from '@/engine/uci'
import { useStockfish } from '@/engine/useStockfish'
import { useChessGame, type UseChessGame } from '@/hooks/useChessGame'
import {
  getTimeControl,
  useChessClock,
  type TimeControlId,
  type UseChessClock,
} from '@/hooks/useChessClock'
import type { Color, PieceSymbol, Square } from '@/utils/chess'

export type BattlePhase = 'setup' | 'playing' | 'over'
export type ColorChoice = 'white' | 'black' | 'random'
export type BattleOutcome = 'win' | 'loss' | 'draw'

export interface BattleConfig {
  levelId: LevelId
  colorChoice: ColorChoice
  timeControlId: TimeControlId
}

export interface BattleResult {
  outcome: BattleOutcome
  /** French sentence shown to the player. */
  label: string
}

export interface UseBattleGame {
  phase: BattlePhase
  game: UseChessGame
  clock: UseChessClock
  level: EngineLevel
  playerColor: Color
  /** True while the engine is deciding on its move. */
  isThinking: boolean
  isEngineReady: boolean
  /**
   * True once the engine has failed to produce a move often enough that it is
   * not going to. The game cannot go on, and saying so beats a board that will
   * never move again.
   */
  isEngineStalled: boolean
  result: BattleResult | null
  start: (config: BattleConfig) => void
  /** Plays a move for the human side; ignored when it is not their turn. */
  playerMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  resign: () => void
  backToSetup: () => void
}

function resolveColor(choice: ColorChoice): Color {
  if (choice === 'white') return 'w'
  if (choice === 'black') return 'b'
  return Math.random() < 0.5 ? 'w' : 'b'
}

/**
 * How many searches may come back without a move before the engine is given up
 * on. The failed search that starts the run counts: three is one attempt and
 * two retries.
 *
 * A failure is usually transient, so retrying is worth it; a position the engine
 * will not answer at all must not leave the player in front of a board that can
 * never move, which is what happened before the count existed.
 */
export const MAX_ENGINE_FAILURES = 3

const DEFAULT_CONFIG: BattleConfig = {
  levelId: 3,
  colorChoice: 'white',
  timeControlId: 'unlimited',
}

/**
 * Drives a game against Stockfish: calibrated level, chosen
 * colour, optional clock, engine replies after a simulated think time, and
 * automatic detection of mate, stalemate, draw, timeout and resignation.
 */
export function useBattleGame(): UseBattleGame {
  const [config, setConfig] = useState<BattleConfig>(DEFAULT_CONFIG)
  const [phase, setPhase] = useState<BattlePhase>('setup')
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [isThinking, setIsThinking] = useState(false)
  const [result, setResult] = useState<BattleResult | null>(null)
  /**
   * Consecutive searches that produced no move.
   *
   * State rather than a ref, deliberately, and for the reason the coach keeps
   * its own refusal counts in state: a failed search plays nothing and changes
   * nothing else, so counting it is the only thing that will run the effect
   * below again. A ref would leave the game stopped on the engine's turn.
   */
  const [engineFailures, setEngineFailures] = useState(0)
  /**
   * How many games have been dealt. Nothing reads the number; it exists so that
   * dealing a game is visible to the effects even when every other value they
   * watch happens to be identical — a second game started from the setup screen
   * without a move played in the first one would otherwise leave the clock
   * reset and never restarted.
   */
  const [deal, setDeal] = useState(0)

  const level = getLevel(config.levelId)
  const timeControl = getTimeControl(config.timeControlId)

  const game = useChessGame()
  const clock = useChessClock(timeControl)
  const { isReady, analyze, configureLevel } = useStockfish({ enabled: true, depth: level.depth })

  // Apply the level's strength settings whenever the engine or level changes.
  useEffect(() => {
    if (isReady) void configureLevel(level)
  }, [isReady, level, configureLevel])

  // Depend on the clock's stable callbacks, never on the clock object: it is
  // rebuilt on every tick, which would restart the effects ten times a second.
  const {
    press: clockPress,
    start: clockStart,
    stop: clockStop,
    reset: clockReset,
    flagged,
  } = clock

  /** The position the engine is already searching, so it is searched once. */
  const thinkingFor = useRef<string | null>(null)

  /**
   * Deals a new game. Clears everything the last one left behind — including
   * the clock and the position the engine was searching, which used to be the
   * business of backToSetup alone. That was safe only while the setup screen
   * was the one way back here: a "Rejouer" on the end-of-game card would call
   * this directly and inherit a spent clock and a mute engine.
   */
  const start = useCallback(
    (next: BattleConfig) => {
      setConfig(next)
      setPlayerColor(resolveColor(next.colorChoice))
      setResult(null)
      setIsThinking(false)
      setEngineFailures(0)
      thinkingFor.current = null
      clockReset()
      game.reset()
      setDeal((count) => count + 1)
      setPhase('playing')
    },
    [game, clockReset],
  )

  // White always moves first, so the clock starts on white.
  useEffect(() => {
    if (phase === 'playing' && game.sanHistory.length === 0) clockStart('w')
  }, [phase, deal, game.sanHistory.length, clockStart])

  const isEngineStalled = engineFailures >= MAX_ENGINE_FAILURES

  // An engine that stopped answering has not lost on time, and the player has
  // not won: stop the clock rather than let it decide a game nobody played.
  useEffect(() => {
    if (isEngineStalled) clockStop()
  }, [isEngineStalled, clockStop])

  const playerMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (phase !== 'playing' || game.turn !== playerColor || game.status.isOver) return false
      const applied = game.move(from, to, promotion)
      if (!applied) return false
      clockPress(playerColor)
      return true
    },
    [phase, game, playerColor, clockPress],
  )

  // The engine answers after a human-looking pause.
  useEffect(() => {
    if (phase !== 'playing' || game.status.isOver || !isReady) return
    if (game.turn === playerColor) return
    if (thinkingFor.current === game.fen) return
    if (isEngineStalled) return

    thinkingFor.current = game.fen
    const engineColor: Color = playerColor === 'w' ? 'b' : 'w'
    let cancelled = false
    setIsThinking(true)

    // Nothing was played, so let the position be searched again and count the
    // attempt — the count is what re-runs this effect, and what stops it once
    // the engine has had its chances.
    const failed = () => {
      thinkingFor.current = null
      setEngineFailures((count) => count + 1)
    }

    const timer = setTimeout(() => {
      void analyze(game.fen, level.depth).then((analysis) => {
        if (cancelled) return
        setIsThinking(false)
        const move = analysis?.bestMove ? parseUciMove(analysis.bestMove) : null
        if (!move) return failed()
        const applied = game.move(
          move.from as Square,
          move.to as Square,
          move.promotion as PieceSymbol | undefined,
        )
        // An illegal move counts as no move: the engine answered, but with
        // something this position cannot play.
        if (!applied) return failed()
        setEngineFailures(0)
        clockPress(engineColor)
      })
    }, thinkingDelay(level))

    return () => {
      cancelled = true
      clearTimeout(timer)
      setIsThinking(false)
      // A search cancelled before it answered leaves nothing behind, so let the
      // position be searched again. Otherwise the guard above turns the next run
      // away, no move is ever played, and no failure is counted either - the
      // board simply stops, which is the one hole the retry count cannot cover.
      //
      // Unconditional: cleanup runs before the next run's body, so the ref holds
      // either this run's position or the null a failure left. Comparing first
      // was a condition that could not come out false.
      thinkingFor.current = null
    }
    // engineFailures, not just the flag derived from it: every failed search
    // has to run this again, and the flag only moves on the last one.
  }, [
    phase,
    game,
    playerColor,
    isReady,
    analyze,
    level,
    clockPress,
    engineFailures,
    isEngineStalled,
  ])

  // End-of-game detection: mate, stalemate, draw, then timeout.
  useEffect(() => {
    if (phase !== 'playing') return

    if (game.status.isOver) {
      clockStop()
      setPhase('over')
      const { reason, winner } = game.status
      if (reason === 'checkmate') {
        const playerWon = winner === playerColor
        setResult({
          outcome: playerWon ? 'win' : 'loss',
          label: playerWon ? 'Échec et mat — vous gagnez !' : "Échec et mat — l'IA gagne.",
        })
      } else if (reason === 'stalemate') {
        setResult({ outcome: 'draw', label: 'Pat — partie nulle.' })
      } else {
        setResult({ outcome: 'draw', label: 'Partie nulle.' })
      }
      return
    }

    if (flagged) {
      setPhase('over')
      const playerFlagged = flagged === playerColor
      setResult({
        outcome: playerFlagged ? 'loss' : 'win',
        label: playerFlagged ? 'Temps écoulé — vous perdez.' : "Temps écoulé — l'IA perd au temps.",
      })
    }
  }, [phase, game.status, flagged, clockStop, playerColor])

  const resign = useCallback(() => {
    if (phase !== 'playing') return
    clockStop()
    setPhase('over')
    setResult({ outcome: 'loss', label: 'Vous avez abandonné.' })
  }, [phase, clockStop])

  const backToSetup = useCallback(() => {
    clockReset()
    game.reset()
    setResult(null)
    setIsThinking(false)
    setEngineFailures(0)
    thinkingFor.current = null
    setPhase('setup')
  }, [clockReset, game])

  return {
    phase,
    game,
    clock,
    level,
    playerColor,
    isThinking,
    isEngineReady: isReady,
    isEngineStalled,
    result,
    start,
    playerMove,
    resign,
    backToSetup,
  }
}
