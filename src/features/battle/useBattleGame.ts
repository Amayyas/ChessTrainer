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

const DEFAULT_CONFIG: BattleConfig = {
  levelId: 3,
  colorChoice: 'white',
  timeControlId: 'unlimited',
}

/**
 * Drives a game against Stockfish (spec section 2.2): calibrated level, chosen
 * colour, optional clock, engine replies after a simulated think time, and
 * automatic detection of mate, stalemate, draw, timeout and resignation.
 */
export function useBattleGame(): UseBattleGame {
  const [config, setConfig] = useState<BattleConfig>(DEFAULT_CONFIG)
  const [phase, setPhase] = useState<BattlePhase>('setup')
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [isThinking, setIsThinking] = useState(false)
  const [result, setResult] = useState<BattleResult | null>(null)

  const level = getLevel(config.levelId)
  const timeControl = getTimeControl(config.timeControlId)

  const game = useChessGame()
  const clock = useChessClock(timeControl)
  const { isReady, analyze, configureLevel } = useStockfish({ enabled: true, depth: level.depth })

  // Apply the level's strength settings whenever the engine or level changes.
  useEffect(() => {
    if (isReady) void configureLevel(level)
  }, [isReady, level, configureLevel])

  const start = useCallback(
    (next: BattleConfig) => {
      setConfig(next)
      setPlayerColor(resolveColor(next.colorChoice))
      setResult(null)
      setIsThinking(false)
      game.reset()
      setPhase('playing')
    },
    [game],
  )

  // Depend on the clock's stable callbacks, never on the clock object: it is
  // rebuilt on every tick, which would restart the effects ten times a second.
  const { press: clockPress, start: clockStart, stop: clockStop, flagged } = clock

  // White always moves first, so the clock starts on white.
  useEffect(() => {
    if (phase === 'playing' && game.sanHistory.length === 0) clockStart('w')
  }, [phase, game.sanHistory.length, clockStart])

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
  const thinkingFor = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'playing' || game.status.isOver || !isReady) return
    if (game.turn === playerColor) return
    if (thinkingFor.current === game.fen) return

    thinkingFor.current = game.fen
    const engineColor: Color = playerColor === 'w' ? 'b' : 'w'
    let cancelled = false
    setIsThinking(true)

    const timer = setTimeout(() => {
      void analyze(game.fen, level.depth).then((analysis) => {
        if (cancelled) return
        setIsThinking(false)
        const move = analysis?.bestMove ? parseUciMove(analysis.bestMove) : null
        if (!move) return
        const applied = game.move(
          move.from as Square,
          move.to as Square,
          move.promotion as PieceSymbol | undefined,
        )
        if (applied) clockPress(engineColor)
      })
    }, thinkingDelay(level))

    return () => {
      cancelled = true
      clearTimeout(timer)
      setIsThinking(false)
    }
  }, [phase, game, playerColor, isReady, analyze, level, clockPress])

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
    clock.reset()
    game.reset()
    setResult(null)
    setIsThinking(false)
    thinkingFor.current = null
    setPhase('setup')
  }, [clock, game])

  return {
    phase,
    game,
    clock,
    level,
    playerColor,
    isThinking,
    isEngineReady: isReady,
    result,
    start,
    playerMove,
    resign,
    backToSetup,
  }
}
