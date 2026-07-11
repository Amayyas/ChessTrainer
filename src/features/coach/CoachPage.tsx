import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { ChessBoard, EvalBar, MoveHistory } from '@/components/Board'
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/UI'
import GameSummary from '@/features/coach/GameSummary'
import { useCoachAnalysis } from '@/features/coach/useCoachAnalysis'
import { useChessGame } from '@/hooks/useChessGame'
import { describeStatus } from '@/utils/chess'

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

  useEffect(() => setHintLevel(0), [game.fen])

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
        <div className="mx-auto flex w-full max-w-[560px] gap-3">
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
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {game.status.isOver && !inReplay && (
            <GameSummary summary={analysis.summary} statusLabel={statusLabel} />
          )}

          <Card className="flex h-fit flex-col gap-5">
            {!game.status.isOver && (
              <div>
                <h2 className="mb-2 font-display text-lg font-bold text-ebene">
                  État de la partie
                </h2>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
            )}

            <div>
              <h2 className="mb-2 font-display text-lg font-bold text-ebene">Coups joués</h2>
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
