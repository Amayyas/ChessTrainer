import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { BattleOutcome } from '@/features/battle/useBattleGame'
import { useCoachAnalysis } from '@/features/coach/useCoachAnalysis'
import { useChessGame } from '@/hooks/useChessGame'
import { board } from '@/lib/design-tokens'
import { useProgressionStore } from '@/store/useProgressionStore'
import { createGame, describeStatus, type Color, type Square } from '@/utils/chess'

const PIECE_NAMES: Record<string, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
}

/** How many hint steps there are: piece, origin square, then the move itself. */
const MAX_HINT_LEVEL = 3

type CoachMode = 'game' | 'analysis'

/**
 * Everything behind the Coach screen: the game, the engine analysis, and the
 * orchestration that used to sit inline in the page — mode and free-analysis
 * FEN, progressive hints, the move-by-move replay, the battle handed over for
 * review, and recording a finished game once. The component renders from what
 * this returns and holds no logic of its own.
 */
export function useCoachPageState() {
  const game = useChessGame()
  const analysis = useCoachAnalysis(game, { enabled: true })

  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [hintLevel, setHintLevel] = useState(0)
  const [replayPly, setReplayPly] = useState<number | null>(null)
  // Best-move arrow is off by default (play your own move first) but available
  // on demand: the arrow is meant to be toggleable, not always on.
  const [showArrow, setShowArrow] = useState(false)
  // "Partie" plays from the start; "Analyse libre" starts from a pasted FEN
  // (play a full game against yourself, or analyse freely).
  const [mode, setMode] = useState<CoachMode>('game')
  const [fenInput, setFenInput] = useState('')
  const [fenError, setFenError] = useState<string | null>(null)

  useEffect(() => setHintLevel(0), [game.fen])

  // A game handed over from the battle mode opens straight into replay, so it
  // can be reviewed move by move with the annotations.
  const location = useLocation()
  const handedOver = location.state as {
    pgn?: string
    playerColor?: Color
    levelLabel?: string
    outcome?: BattleOutcome
    playedAt?: string
  } | null
  const handedOverPgn = handedOver?.pgn

  /**
   * The battle under review, tied to the exact game it describes.
   *
   * Keyed by PGN on purpose. Held loose, this metadata outlived the game it came
   * from: switching to free analysis, loading a FEN or starting a fresh game
   * left it in place, and the next game to finish was recorded with the previous
   * battle's colour, level and outcome — the very thing this feature exists to
   * prevent.
   */
  const reviewed = useRef<{
    pgn: string
    color: Color
    level: string
    outcome: BattleOutcome
    playedAt: string
  } | null>(null)
  const loadedPgn = useRef<string | null>(null)
  useEffect(() => {
    if (!handedOverPgn || loadedPgn.current === handedOverPgn) return
    loadedPgn.current = handedOverPgn
    reviewed.current =
      handedOver?.playerColor && handedOver.levelLabel && handedOver.outcome
        ? {
            pgn: handedOverPgn,
            color: handedOver.playerColor,
            level: handedOver.levelLabel,
            outcome: handedOver.outcome,
            playedAt: handedOver.playedAt ?? new Date().toISOString(),
          }
        : null
    if (game.loadPgn(handedOverPgn)) {
      setMode('game')
      setReplayPly(0)
    }
  }, [handedOverPgn, handedOver, game])

  const selectMode = useCallback(
    (next: CoachMode) => {
      if (next === mode) return
      setReplayPly(null)
      setFenError(null)
      if (next === 'game') game.reset()
      else setFenInput(game.fen)
      setMode(next)
    },
    [mode, game],
  )

  const loadFen = useCallback(() => {
    const trimmed = fenInput.trim()
    if (!createGame(trimmed)) {
      setFenError('FEN invalide.')
      return
    }
    setFenError(null)
    setReplayPly(null)
    game.reset(trimmed)
  }, [fenInput, game])

  // FEN of each position from the start (index 0) to the latest move.
  const plyFens = useMemo(() => {
    if (game.history.length === 0) return [game.fen]
    return [game.history[0]!.before, ...game.history.map((move) => move.after)]
  }, [game.history, game.fen])

  const inReplay = replayPly !== null
  const viewFen = inReplay ? (plyFens[replayPly] ?? game.fen) : game.fen
  const insight = inReplay
    ? analysis.analysisAt(viewFen)
    : { eval: analysis.currentEval, bestMove: analysis.bestMove }

  const viewLastMove =
    inReplay && replayPly > 0
      ? { from: game.history[replayPly - 1]!.from, to: game.history[replayPly - 1]!.to }
      : inReplay
        ? null
        : game.lastMove

  // A finished, analysed game counts towards progression, once per game.
  const recordCoachAnalysis = useProgressionStore((state) => state.recordCoachAnalysis)
  const recordedGame = useRef<string | null>(null)
  useEffect(() => {
    if (game.sanHistory.length === 0) {
      recordedGame.current = null
      return
    }

    // This game is a battle under review only while it still is that game.
    const review = reviewed.current?.pgn === game.pgn ? reviewed.current : null

    // A battle can end without the board ending: resignation and timeout both
    // hand over a position with legal moves left. Requiring a terminal position
    // meant those games — which carry a perfectly good result — were never
    // recorded at all.
    if (!game.status.isOver && review === null) return

    // Wait for the whole game. Stockfish works through it position by position,
    // and the summary read too early is built from the few moves done so far —
    // which is how a game once recorded 100%, off a single mate.
    if (!analysis.summary.isComplete) return
    if (recordedGame.current === game.pgn) return

    recordedGame.current = game.pgn
    const battleAccuracy =
      review === null
        ? null
        : review.color === 'w'
          ? analysis.summary.accuracyWhite
          : analysis.summary.accuracyBlack
    recordCoachAnalysis({
      battleAccuracy,
      battle: review
        ? { level: review.level, outcome: review.outcome, playedAt: review.playedAt }
        : undefined,
    })
  }, [game.status.isOver, game.sanHistory.length, game.pgn, analysis.summary, recordCoachAnalysis])

  const statusLabel = describeStatus(game.status, game.turn)
  const statusVariant: 'gold' | 'danger' | 'neutral' = game.status.isOver
    ? 'gold'
    : game.status.isCheck
      ? 'danger'
      : 'neutral'

  const showBestArrow = showArrow && insight.bestMove !== null && (inReplay || !game.status.isOver)
  const arrows = showBestArrow
    ? ([[insight.bestMove!.from, insight.bestMove!.to, board.arrow]] as [Square, Square, string][])
    : undefined

  const hint = useMemo(() => {
    if (!analysis.bestMove) return null
    const probe = new Chess(game.fen)
    const piece = probe.get(analysis.bestMove.from)
    let san: string | null = null
    try {
      san = probe.move({
        from: analysis.bestMove.from,
        to: analysis.bestMove.to,
        promotion: 'q',
      }).san
    } catch {
      san = null
    }
    return { piece: piece ? PIECE_NAMES[piece.type] : 'pièce', from: analysis.bestMove.from, san }
  }, [analysis.bestMove, game.fen])

  const hintMessages = hint
    ? [
        `Cherchez le meilleur coup pour votre ${hint.piece}.`,
        `Déplacez votre ${hint.piece} depuis ${hint.from}.`,
        hint.san ? `Le meilleur coup est ${hint.san}.` : 'Analyse en cours…',
      ]
    : []

  const lastPly = plyFens.length - 1

  const flipBoard = useCallback(
    () => setOrientation((current) => (current === 'white' ? 'black' : 'white')),
    [],
  )
  const toggleArrow = useCallback(() => setShowArrow((shown) => !shown), [])
  const revealHint = useCallback(
    () => setHintLevel((level) => Math.min(MAX_HINT_LEVEL, level + 1)),
    [],
  )
  const newGame = useCallback(() => game.reset(), [game])
  const enterReplay = useCallback(() => setReplayPly(lastPly), [lastPly])
  const exitReplay = useCallback(() => setReplayPly(null), [])
  const goToStart = useCallback(() => setReplayPly(0), [])
  const goToEnd = useCallback(() => setReplayPly(lastPly), [lastPly])
  const stepBack = useCallback(() => setReplayPly((ply) => Math.max(0, (ply ?? 0) - 1)), [])
  const stepForward = useCallback(
    () => setReplayPly((ply) => Math.min(lastPly, (ply ?? 0) + 1)),
    [lastPly],
  )

  return {
    game,
    analysis,

    orientation,
    flipBoard,

    mode,
    selectMode,
    fenInput,
    setFenInput,
    fenError,
    loadFen,

    showArrow,
    toggleArrow,

    hintLevel,
    hintMessages,
    canRevealHint: analysis.isReady && hintLevel < MAX_HINT_LEVEL,
    revealHint,
    maxHintLevel: MAX_HINT_LEVEL,

    newGame,

    inReplay,
    replayPly: replayPly ?? 0,
    lastPly,
    enterReplay,
    exitReplay,
    goToStart,
    goToEnd,
    stepBack,
    stepForward,

    viewFen,
    viewLastMove,
    insight,
    arrows,
    statusLabel,
    statusVariant,
  }
}
