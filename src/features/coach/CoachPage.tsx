import { Chess } from 'chess.js'
import { useEffect, useMemo, useState } from 'react'
import { ChessBoard, EvalBar, MoveHistory } from '@/components/Board'
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/UI'
import { useChessGame } from '@/hooks/useChessGame'
import { useCoachAnalysis } from '@/features/coach/useCoachAnalysis'
import { describeStatus, type Square } from '@/utils/chess'

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
 * evaluation bar, best-move arrow, per-move classification and progressive hints.
 * The end-of-game summary and replay are added in the next commit.
 */
export default function CoachPage() {
  const game = useChessGame()
  const analysis = useCoachAnalysis(game, { enabled: true })
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [showArrow, setShowArrow] = useState(true)
  const [hintLevel, setHintLevel] = useState(0)

  // Each new position starts from no revealed hint.
  useEffect(() => setHintLevel(0), [game.fen])

  const statusLabel = describeStatus(game.status, game.turn)
  const statusVariant = game.status.isOver ? 'gold' : game.status.isCheck ? 'danger' : 'neutral'

  const showBestArrow = showArrow && !game.status.isOver && analysis.bestMove !== null
  const arrows = showBestArrow
    ? ([[analysis.bestMove!.from, analysis.bestMove!.to, '#C9A84C']] as [Square, Square, string][])
    : undefined

  // Best move expressed for hints: which piece, from where, and its notation.
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
    return {
      piece: piece ? PIECE_NAMES[piece.type] : 'pièce',
      from: analysis.bestMove.from,
      san,
    }
  }, [analysis.bestMove, game.fen])

  const hintMessages = hint
    ? [
        `Cherchez le meilleur coup pour votre ${hint.piece}.`,
        `Déplacez votre ${hint.piece} depuis ${hint.from}.`,
        hint.san ? `Le meilleur coup est ${hint.san}.` : 'Analyse en cours…',
      ]
    : []

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
          <EvalBar evaluation={analysis.currentEval} orientation={orientation} className="h-auto" />
          <div className="min-w-0 flex-1">
            <ChessBoard
              fen={game.fen}
              turn={game.turn}
              orientation={orientation}
              onMove={(from, to, promotion) => game.move(from, to, promotion) !== null}
              getLegalTargets={game.getLegalTargets}
              isPromotion={game.isPromotion}
              lastMove={game.lastMove}
              checkSquare={game.checkSquare}
              arrows={arrows}
            />
          </div>
        </div>

        <Card className="flex h-fit flex-col gap-5">
          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-ebene">État de la partie</h2>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

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
            <MoveHistory moves={game.sanHistory} qualities={analysis.qualities} />
          </div>

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
          </div>
        </Card>
      </div>
    </div>
  )
}
