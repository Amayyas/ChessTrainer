import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { ChessBoard, EvalBar, MoveHistory } from '@/components/Board'
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/UI'
import GameSummary from '@/features/coach/GameSummary'
import { useCoachAnalysis } from '@/features/coach/useCoachAnalysis'
import { useChessGame } from '@/hooks/useChessGame'
import { createGame, describeStatus, type Square } from '@/utils/chess'

const PIECE_NAMES: Record<string, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
}

/**
 * Coach mode (spec section 2.1): a playable board with live Stockfish analysis —
 * evaluation bar, best-move arrow, per-move classification, progressive hints,
 * an end-of-game summary and a move-by-move replay.
 */
export default function CoachPage() {
  const game = useChessGame()
  const analysis = useCoachAnalysis(game, { enabled: true })
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [hintLevel, setHintLevel] = useState(0)
  const [replayPly, setReplayPly] = useState<number | null>(null)
  // Best-move arrow is off by default (play your own move first) but available
  // on demand, as the specification requires it to be toggleable (section 2.1).
  const [showArrow, setShowArrow] = useState(false)
  // "Partie" plays from the start; "Analyse libre" starts from a pasted FEN
  // (spec section 2.1: play a full game against yourself, or free analysis).
  const [mode, setMode] = useState<'game' | 'analysis'>('game')
  const [fenInput, setFenInput] = useState('')
  const [fenError, setFenError] = useState<string | null>(null)

  useEffect(() => setHintLevel(0), [game.fen])

  const selectMode = (next: 'game' | 'analysis') => {
    if (next === mode) return
    setReplayPly(null)
    setFenError(null)
    if (next === 'game') game.reset()
    else setFenInput(game.fen)
    setMode(next)
  }

  const loadFen = () => {
    const trimmed = fenInput.trim()
    if (!createGame(trimmed)) {
      setFenError('FEN invalide.')
      return
    }
    setFenError(null)
    setReplayPly(null)
    game.reset(trimmed)
  }

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

  const statusLabel = describeStatus(game.status, game.turn)
  const statusVariant = game.status.isOver ? 'gold' : game.status.isCheck ? 'danger' : 'neutral'

  const showBestArrow = showArrow && insight.bestMove !== null && (inReplay || !game.status.isOver)
  const arrows = showBestArrow
    ? ([[insight.bestMove!.from, insight.bestMove!.to, '#C9A84C']] as [Square, Square, string][])
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

  const exitReplay = () => setReplayPly(null)
  const lastPly = plyFens.length - 1

  return (
    <div>
      <PageHeader
        title="Coach"
        subtitle="Jouez les deux camps ; l'IA évalue la position, classe chaque coup et suggère le meilleur."
        actions={
          analysis.isAnalyzing ? (
            <span className="flex items-center gap-2 text-sm text-ardoise">
              <Spinner size="sm" /> Analyse…
            </span>
          ) : analysis.isReady ? (
            <Badge variant="neutral">IA prête</Badge>
          ) : (
            <span className="flex items-center gap-2 text-sm text-ardoise">
              <Spinner size="sm" /> Chargement de l'IA…
            </span>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* self-start keeps the eval bar tied to the board height instead of
            stretching to the (taller) side panel as the move list grows. */}
        <div className="mx-auto flex w-full max-w-[560px] gap-3 self-start">
          <EvalBar evaluation={insight.eval} orientation={orientation} />
          <div className="min-w-0 flex-1">
            <ChessBoard
              fen={viewFen}
              turn={game.turn}
              orientation={orientation}
              interactive={!inReplay}
              onMove={(from, to, promotion) => game.move(from, to, promotion) !== null}
              getLegalTargets={game.getLegalTargets}
              isPromotion={game.isPromotion}
              lastMove={viewLastMove}
              checkSquare={inReplay ? null : game.checkSquare}
              arrows={arrows}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {game.status.isOver && !inReplay && (
            <GameSummary summary={analysis.summary} statusLabel={statusLabel} />
          )}

          <Card className="flex h-fit flex-col gap-5">
            {!inReplay && (
              <div>
                <div
                  role="group"
                  aria-label="Mode du coach"
                  className="inline-flex rounded-lg bg-ebene/5 p-1"
                >
                  {(['game', 'analysis'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectMode(value)}
                      aria-pressed={mode === value}
                      className={
                        mode === value
                          ? 'rounded-md bg-white px-3 py-1 text-sm font-semibold text-ebene shadow-sm'
                          : 'rounded-md px-3 py-1 text-sm font-medium text-ardoise hover:text-ebene'
                      }
                    >
                      {value === 'game' ? 'Partie' : 'Analyse libre'}
                    </button>
                  ))}
                </div>

                {mode === 'analysis' && (
                  <div className="mt-3">
                    <label htmlFor="fen-input" className="text-xs font-medium text-ardoise">
                      Position de départ (FEN)
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="fen-input"
                        value={fenInput}
                        onChange={(event) => setFenInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && loadFen()}
                        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        className="min-w-0 flex-1 rounded-lg border border-ebene/20 px-2 py-1.5 text-sm"
                      />
                      <Button size="sm" onClick={loadFen}>
                        Charger
                      </Button>
                    </div>
                    {fenError && <p className="mt-1 text-xs text-red-600">{fenError}</p>}
                  </div>
                )}
              </div>
            )}

            {!game.status.isOver && (
              <div>
                <h2 className="mb-2 font-display text-lg font-bold text-ebene">
                  État de la partie
                </h2>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ebene">Coups joués</h2>
                <button
                  type="button"
                  onClick={() => setShowArrow((v) => !v)}
                  className="text-xs font-semibold text-ardoise underline-offset-2 hover:text-ebene hover:underline"
                  aria-pressed={showArrow}
                >
                  {showArrow ? 'Masquer la flèche' : 'Afficher la flèche'}
                </button>
              </div>
              <MoveHistory
                moves={game.sanHistory}
                qualities={analysis.qualities}
                activeIndex={inReplay ? replayPly - 1 : undefined}
              />
            </div>

            {inReplay ? (
              <div>
                <h2 className="mb-2 font-display text-lg font-bold text-ebene">Rejouer</h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Début"
                    disabled={replayPly === 0}
                    onClick={() => setReplayPly(0)}
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Coup précédent"
                    disabled={replayPly === 0}
                    onClick={() => setReplayPly((p) => Math.max(0, (p ?? 0) - 1))}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Coup suivant"
                    disabled={replayPly >= lastPly}
                    onClick={() => setReplayPly((p) => Math.min(lastPly, (p ?? 0) + 1))}
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Fin"
                    disabled={replayPly >= lastPly}
                    onClick={() => setReplayPly(lastPly)}
                  >
                    »
                  </Button>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={exitReplay}>
                    Quitter
                  </Button>
                </div>
                <p className="mt-2 text-xs text-ardoise">
                  Coup {replayPly} / {lastPly}
                </p>
              </div>
            ) : (
              <>
                {!game.status.isOver && (
                  <div>
                    <h2 className="mb-2 font-display text-lg font-bold text-ebene">Indices</h2>
                    {hintLevel === 0 ? (
                      <p className="text-sm text-ardoise">
                        Bloqué ? Révélez un indice à la fois, sans dévoiler tout le coup.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm text-ebene">
                        {hintMessages.slice(0, hintLevel).map((message, index) => (
                          <li key={index} className="flex gap-2">
                            <span className="font-semibold text-or">{index + 1}.</span>
                            {message}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      disabled={!analysis.isReady || hintLevel >= 3}
                      onClick={() => setHintLevel((level) => Math.min(3, level + 1))}
                    >
                      {hintLevel === 0
                        ? 'Demander un indice'
                        : hintLevel >= 3
                          ? 'Indice complet'
                          : 'Indice suivant'}
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={game.undo}
                    disabled={game.sanHistory.length === 0}
                  >
                    Annuler
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => game.reset()}>
                    Nouvelle partie
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                  >
                    Retourner le plateau
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={game.sanHistory.length === 0}
                    onClick={() => setReplayPly(lastPly)}
                  >
                    Revoir la partie
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
