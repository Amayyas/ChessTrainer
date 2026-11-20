import { Chess } from 'chess.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Analysis } from '@/engine/stockfishEngine'
import { parseUciMove } from '@/engine/uci'
import { useStockfish } from '@/engine/useStockfish'
import type { Endgame, EndgameGoal } from '@/features/puzzle/endgames'
import { markMastered } from '@/features/puzzle/progress'
import { useChessGame, type UseChessGame } from '@/hooks/useChessGame'
import { useProgressionStore } from '@/store/useProgressionStore'
import type { Color, GameOverReason, PieceSymbol, Square } from '@/utils/chess'

/** The engine searches as deep as the project allows anywhere (≤12), at full strength. */
export const ENGINE_DEPTH = 12
/** How many moves a defence must last to count as held. */
export const HOLD_MOVES = 15
/** Below this edge, in centipawns, a position meant to be won no longer is. */
export const WIN_MARGIN_CP = 150
/** The edge a promotion must leave for the win to stand: the new queen not lost. */
export const PROMOTION_MARGIN_CP = 400
/** Beyond this edge for the engine, a position meant to be held is lost. */
export const HOLD_LOST_CP = 300
/** A pause before the engine answers, so its moves do not land instantly. */
const THINK_MS = 350

export type EndgameStatus = 'playing' | 'won' | 'failed'

export interface Verdict {
  won: boolean
  message: string
}

/**
 * The player's edge, in centipawns, from a search the engine ran on its own
 * move: the engine's score, turned round. A forced mate is an edge no
 * centipawn count reaches, either way.
 */
export function playerEdge(analysis: Pick<Analysis, 'scoreCp' | 'scoreMate'>): number {
  if (analysis.scoreMate !== null) return analysis.scoreMate > 0 ? -Infinity : Infinity
  return -(analysis.scoreCp ?? 0)
}

/**
 * What the engine's search says about the attempt, before it plays: a
 * verdict when the endgame is decided, or null while it is still on.
 *
 * A win slips away as soon as the edge falls under WIN_MARGIN_CP — a rook
 * left hanging is not a win the player still has to finish. A promotion wins
 * only if the queen survives it. A defence falls once the engine's edge
 * passes HOLD_LOST_CP.
 */
export function judge(
  goal: EndgameGoal,
  analysis: Pick<Analysis, 'scoreCp' | 'scoreMate'>,
  promoted: boolean,
): Verdict | null {
  const edge = playerEdge(analysis)
  if (goal === 'hold') {
    return edge <= -HOLD_LOST_CP
      ? { won: false, message: 'La défense a cédé : la position est perdue.' }
      : null
  }
  if (goal === 'promote' && promoted) {
    return edge >= PROMOTION_MARGIN_CP
      ? { won: true, message: 'Pion promu, et la partie reste gagnée.' }
      : { won: false, message: 'La promotion ne gagne pas : la nouvelle pièce est perdue.' }
  }
  return edge < WIN_MARGIN_CP ? { won: false, message: 'La position n’est plus gagnante.' } : null
}

const DRAWS: Record<Exclude<GameOverReason, 'checkmate'>, string> = {
  stalemate: 'pat',
  threefold: 'triple répétition',
  'fifty-move': 'règle des cinquante coups',
  insufficient: 'matériel insuffisant',
  draw: 'nulle',
}

export interface UseEndgameSession {
  game: UseChessGame
  player: Color
  status: EndgameStatus
  /** Why the endgame was won or lost, once it is. */
  message: string | null
  /** The player's moves so far: a defence counts them to HOLD_MOVES. */
  playerMoves: number
  isThinking: boolean
  isEngineReady: boolean
  playerMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  restart: () => void
}

/**
 * One endgame played out against Stockfish at full strength, until it is won,
 * held, or no longer what it was meant to be. Winning or holding it marks it
 * mastered in the player's progression.
 */
export function useEndgameSession(endgame: Endgame | null): UseEndgameSession {
  const game = useChessGame(endgame?.fen)
  const { isReady, analyze } = useStockfish({ enabled: endgame !== null, depth: ENGINE_DEPTH })
  const setProgress = useProgressionStore((state) => state.setPuzzleProgress)

  const player: Color = endgame ? new Chess(endgame.fen).turn() : 'w'
  const [status, setStatus] = useState<EndgameStatus>('playing')
  const [message, setMessage] = useState<string | null>(null)
  const [playerMoves, setPlayerMoves] = useState(0)
  const [isThinking, setIsThinking] = useState(false)
  const promoted = useRef(false)
  /** The position the engine is already searching, so it is searched once. */
  const thinkingFor = useRef<string | null>(null)

  const finish = useCallback(
    ({ won, message: text }: Verdict) => {
      setStatus(won ? 'won' : 'failed')
      setMessage(text)
      if (won && endgame) {
        setProgress((progress) => ({
          ...progress,
          endgamesMastered: markMastered(progress.endgamesMastered, endgame.id),
        }))
      }
    },
    [endgame, setProgress],
  )

  const restart = useCallback(() => {
    if (!endgame) return
    game.reset(endgame.fen)
    setStatus('playing')
    setMessage(null)
    setPlayerMoves(0)
    setIsThinking(false)
    promoted.current = false
    thinkingFor.current = null
  }, [endgame, game])

  // A new endgame starts afresh. Keyed on the id: the game object changes at
  // every move, and restarting on it would undo each one.
  const endgameId = endgame?.id
  const restartRef = useRef(restart)
  restartRef.current = restart
  useEffect(() => {
    restartRef.current()
  }, [endgameId])

  const playerMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (status !== 'playing' || game.turn !== player || isThinking) return false
      const applied = game.move(from, to, promotion)
      if (!applied) return false
      if (applied.promotion) promoted.current = true
      setPlayerMoves((count) => count + 1)
      return true
    },
    [status, game, player, isThinking],
  )

  // The board's own verdicts: a mate either way, or a draw by the rules — a
  // win for a defence, a win thrown away for an attack.
  useEffect(() => {
    if (!endgame || status !== 'playing' || !game.status.isOver) return
    const { reason, winner } = game.status
    if (reason === 'checkmate') {
      finish(
        winner === player
          ? { won: true, message: 'Échec et mat !' }
          : { won: false, message: 'Échec et mat : la finale est perdue.' },
      )
    } else {
      const why = DRAWS[reason ?? 'draw']
      finish(
        endgame.goal === 'hold'
          ? { won: true, message: `Partie nulle (${why}) : la défense a tenu.` }
          : { won: false, message: `Partie nulle (${why}) : la victoire s’est envolée.` },
      )
    }
  }, [endgame, status, game.status, player, finish])

  // A defence that has lasted long enough is held. Checked on the player's
  // turn, after the engine's search had its say on the position.
  useEffect(() => {
    if (!endgame || endgame.goal !== 'hold' || status !== 'playing') return
    if (playerMoves >= HOLD_MOVES && game.turn === player && !game.status.isOver) {
      finish({ won: true, message: `${HOLD_MOVES} coups tenus : la défense est solide.` })
    }
  }, [endgame, status, playerMoves, game.turn, game.status.isOver, player, finish])

  // The engine's move, after its search is read for a verdict.
  useEffect(() => {
    if (!endgame || status !== 'playing' || !isReady) return
    if (game.status.isOver || game.turn === player) return
    if (thinkingFor.current === game.fen) return

    const fen = game.fen
    thinkingFor.current = fen
    let cancelled = false
    setIsThinking(true)

    const timer = setTimeout(() => {
      void analyze(fen, ENGINE_DEPTH).then((analysis) => {
        if (cancelled) return
        setIsThinking(false)
        // A failed search plays nothing; the position is searched again.
        if (!analysis) {
          thinkingFor.current = null
          return
        }
        const verdict = judge(endgame.goal, analysis, promoted.current)
        if (verdict) return finish(verdict)
        const move = analysis.bestMove ? parseUciMove(analysis.bestMove) : null
        if (move) {
          game.move(
            move.from as Square,
            move.to as Square,
            move.promotion as PieceSymbol | undefined,
          )
        }
      })
    }, THINK_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
      setIsThinking(false)
      thinkingFor.current = null
    }
  }, [endgame, status, isReady, game, player, analyze, finish])

  return {
    game,
    player,
    status,
    message,
    playerMoves,
    isThinking,
    isEngineReady: isReady,
    playerMove,
    restart,
  }
}
