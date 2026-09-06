import { ChessBoard, EvalBar, MoveHistory } from '@/components/Board'
import QualityLegend from '@/features/coach/QualityLegend'
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/UI'
import GameSummary from '@/features/coach/GameSummary'
import { useCoachPageState } from '@/features/coach/useCoachPageState'

/**
 * Coach mode: a playable board with live Stockfish analysis —
 * evaluation bar, best-move arrow, per-move classification, progressive hints,
 * an end-of-game summary and a move-by-move replay.
 *
 * All of the orchestration lives in useCoachPageState; this file is the view.
 */
export default function CoachPage() {
  const coach = useCoachPageState()
  const { game, analysis } = coach

  const inReplay = coach.inReplay
  const statusLabel = coach.statusLabel

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
          <EvalBar evaluation={coach.insight.eval} orientation={coach.orientation} />
          <div className="min-w-0 flex-1">
            <ChessBoard
              fen={coach.viewFen}
              turn={game.turn}
              orientation={coach.orientation}
              interactive={!inReplay}
              onMove={(from, to, promotion) => game.move(from, to, promotion) !== null}
              getLegalTargets={game.getLegalTargets}
              isPromotion={game.isPromotion}
              lastMove={coach.viewLastMove}
              checkSquare={inReplay ? null : game.checkSquare}
              arrows={coach.arrows}
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
                      onClick={() => coach.selectMode(value)}
                      aria-pressed={coach.mode === value}
                      className={
                        coach.mode === value
                          ? 'rounded-md bg-white px-3 py-1 text-sm font-semibold text-ebene shadow-sm'
                          : 'rounded-md px-3 py-1 text-sm font-medium text-ardoise hover:text-ebene'
                      }
                    >
                      {value === 'game' ? 'Partie' : 'Analyse libre'}
                    </button>
                  ))}
                </div>

                {coach.mode === 'analysis' && (
                  <div className="mt-3">
                    <label htmlFor="fen-input" className="text-xs font-medium text-ardoise">
                      Position de départ (FEN)
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="fen-input"
                        value={coach.fenInput}
                        onChange={(event) => coach.setFenInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && coach.loadFen()}
                        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        className="min-w-0 flex-1 rounded-lg border border-ebene/20 px-2 py-1.5 text-sm"
                      />
                      <Button size="sm" onClick={coach.loadFen}>
                        Charger
                      </Button>
                    </div>
                    {coach.fenError && (
                      <p className="mt-1 text-xs text-red-600">{coach.fenError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!game.status.isOver && (
              <div>
                <h2 className="mb-2 font-display text-lg font-bold text-ebene">
                  État de la partie
                </h2>
                <Badge variant={coach.statusVariant}>{statusLabel}</Badge>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ebene">Coups joués</h2>
                <button
                  type="button"
                  onClick={coach.toggleArrow}
                  className="text-xs font-semibold text-ardoise underline-offset-2 hover:text-ebene hover:underline"
                  aria-pressed={coach.showArrow}
                >
                  {coach.showArrow ? 'Masquer la flèche' : 'Afficher la flèche'}
                </button>
              </div>
              <MoveHistory
                moves={game.sanHistory}
                qualities={analysis.qualities}
                activeIndex={inReplay ? coach.replayPly - 1 : undefined}
              />
              <div className="mt-2">
                <QualityLegend />
              </div>
            </div>

            {inReplay ? (
              <div>
                <h2 className="mb-2 font-display text-lg font-bold text-ebene">Rejouer</h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Début"
                    disabled={coach.replayPly === 0}
                    onClick={coach.goToStart}
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Coup précédent"
                    disabled={coach.replayPly === 0}
                    onClick={coach.stepBack}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Coup suivant"
                    disabled={coach.replayPly >= coach.lastPly}
                    onClick={coach.stepForward}
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Fin"
                    disabled={coach.replayPly >= coach.lastPly}
                    onClick={coach.goToEnd}
                  >
                    »
                  </Button>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={coach.exitReplay}>
                    Quitter
                  </Button>
                </div>
                <p className="mt-2 text-xs text-ardoise">
                  Coup {coach.replayPly} / {coach.lastPly}
                </p>
              </div>
            ) : (
              <>
                {!game.status.isOver && (
                  <div>
                    <h2 className="mb-2 font-display text-lg font-bold text-ebene">Indices</h2>
                    {coach.hintLevel === 0 ? (
                      <p className="text-sm text-ardoise">
                        Bloqué ? Révélez un indice à la fois, sans dévoiler tout le coup.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm text-ebene">
                        {coach.hintMessages.slice(0, coach.hintLevel).map((message, index) => (
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
                      disabled={!coach.canRevealHint}
                      onClick={coach.revealHint}
                    >
                      {coach.hintLevel === 0
                        ? 'Demander un indice'
                        : coach.hintLevel >= coach.maxHintLevel
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
                  <Button variant="outline" size="sm" onClick={coach.newGame}>
                    Nouvelle partie
                  </Button>
                  <Button variant="ghost" size="sm" onClick={coach.flipBoard}>
                    Retourner le plateau
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={game.sanHistory.length === 0}
                    onClick={coach.enterReplay}
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
