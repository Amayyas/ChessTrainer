import { ChessBoard, EvalBar, MoveHistory, MoveInput } from '@/components/Board'
import HintList from '@/components/HintList'
import { Box, Button, PageHeader, Tag } from '@/components/UI'
import Input from '@/components/UI/Input'
import StatusLine from '@/components/UI/StatusLine'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
import GameSummary from '@/features/coach/GameSummary'
import QualityLegend from '@/features/coach/QualityLegend'
import { useCoachPageState } from '@/features/coach/useCoachPageState'
import { cn } from '@/utils/cn'

/** The head of each block in the panel: capitals, as a paper heads a column. */
const PANEL_HEAD = 'text-kicker font-semibold uppercase'

/**
 * Coach mode: a playable board with live Stockfish analysis —
 * evaluation bar, best-move arrow, per-move classification, progressive hints,
 * an end-of-game summary and a move-by-move replay.
 *
 * Laid out as the newsprint column: the diagram and its gauge, and beside them
 * the panel, ruled off, its blocks headed in capitals and the hints boxed as
 * an aside.
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
            <StatusLine busy>Analyse…</StatusLine>
          ) : analysis.isReady ? (
            <StatusLine>IA prête</StatusLine>
          ) : (
            <StatusLine busy>Chargement de l&apos;IA…</StatusLine>
          )
        }
      />

      <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        {/* self-start keeps the gauge tied to the board height instead of
            stretching to the (taller) side panel as the move list grows; the
            keyboard field sits below the two, so the gauge does not stretch
            down beside it either. On a phone the gauge lies across the top of
            the board. */}
        <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-3.5">
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
          <MoveInput
            className="mt-6"
            fen={game.fen}
            turn={game.turn}
            enabled={!inReplay && !game.status.isOver}
            onMove={(from, to, promotion) => game.move(from, to, promotion) !== null}
            getLegalTargets={game.getLegalTargets}
            isPromotion={game.isPromotion}
            idleMessage={
              inReplay
                ? 'Vous revoyez la partie\u00a0: quittez la revue pour jouer.'
                : 'La partie est terminée.'
            }
          />
        </div>

        <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
          {game.status.isOver && !inReplay && (
            <GameSummary summary={analysis.summary} statusLabel={statusLabel} />
          )}

          <div className="flex flex-col gap-[22px]">
            {!inReplay && (
              <div>
                <ToggleGroup
                  type="single"
                  value={coach.mode}
                  // The coach is in one mode or the other. Radix would let the
                  // chosen one be pressed off, leaving neither.
                  onValueChange={(next) => {
                    if (next) coach.selectMode(next as 'game' | 'analysis')
                  }}
                  aria-label="Mode du coach"
                  className="flex-nowrap"
                >
                  {(['game', 'analysis'] as const).map((value) => (
                    <ToggleGroupItem key={value} value={value}>
                      {value === 'game' ? 'Partie' : 'Analyse libre'}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>

                {coach.mode === 'analysis' && (
                  <div className="mt-4">
                    <label htmlFor="fen-input" className="text-caption font-semibold">
                      Position de départ (FEN)
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        id="fen-input"
                        value={coach.fenInput}
                        onChange={(event) => coach.setFenInput(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && coach.loadFen()}
                        placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        aria-invalid={coach.fenError ? true : undefined}
                        aria-describedby={coach.fenError ? 'fen-error' : undefined}
                        className="min-w-0 flex-1 text-caption"
                      />
                      <Button onClick={coach.loadFen}>Charger</Button>
                    </div>
                    {coach.fenError && (
                      <p id="fen-error" className="mt-1.5 text-caption text-rubric">
                        {coach.fenError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!game.status.isOver && (
              <section aria-labelledby="t-state">
                <h2 id="t-state" className={PANEL_HEAD}>
                  État de la partie
                </h2>
                {/* A check needs answering, so it is set as an alert; the
                    rest of the time the state is a line of italic. Both sit in
                    one live region that stays put, so a screen reader hears a
                    check arrive as it hears the turn change: a line swapped for
                    a tag outside one was never said. */}
                <div role="status" className={coach.statusTone === 'alert' ? 'mt-2' : 'mt-1'}>
                  {coach.statusTone === 'alert' ? (
                    <Tag tone="alert">{statusLabel}</Tag>
                  ) : (
                    <p className="text-body italic">{statusLabel}</p>
                  )}
                </div>
              </section>
            )}

            <section aria-labelledby="t-moves">
              <div className="mb-1 flex items-center justify-between gap-4">
                <h2 id="t-moves" className={PANEL_HEAD}>
                  Coups joués
                </h2>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={coach.toggleArrow}
                  aria-pressed={coach.showArrow}
                >
                  {coach.showArrow ? 'Masquer la flèche' : 'Afficher la flèche'}
                </Button>
              </div>
              <MoveHistory
                moves={game.sanHistory}
                qualities={analysis.qualities}
                activeIndex={inReplay ? coach.replayPly - 1 : undefined}
              />
              <div className="mt-3">
                <QualityLegend />
              </div>
            </section>

            {inReplay ? (
              <section aria-labelledby="t-replay">
                <h2 id="t-replay" className={cn(PANEL_HEAD, 'mb-2')}>
                  Rejouer
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Début"
                    disabled={coach.replayPly === 0}
                    onClick={coach.goToStart}
                  >
                    «
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Coup précédent"
                    disabled={coach.replayPly === 0}
                    onClick={coach.stepBack}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Coup suivant"
                    disabled={coach.replayPly >= coach.lastPly}
                    onClick={coach.stepForward}
                  >
                    ›
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Fin"
                    disabled={coach.replayPly >= coach.lastPly}
                    onClick={coach.goToEnd}
                  >
                    »
                  </Button>
                  <Button variant="quiet" size="sm" className="ml-auto" onClick={coach.exitReplay}>
                    Quitter
                  </Button>
                </div>
                <p className="mt-2 text-caption italic text-ink-soft">
                  Coup {coach.replayPly} / {coach.lastPly}
                </p>
              </section>
            ) : (
              <>
                {!game.status.isOver && (
                  <Box className="px-[22px] pb-4 pt-5">
                    <h2 className={cn(PANEL_HEAD, 'mb-2.5')}>Indices</h2>
                    {coach.hintLevel === 0 ? (
                      <p className="text-caption italic text-ink-soft">
                        Bloqué ? Révélez un indice à la fois, sans dévoiler tout le coup.
                      </p>
                    ) : (
                      <HintList hints={coach.hintMessages.slice(0, coach.hintLevel)} />
                    )}
                    <Button
                      variant="quiet"
                      size="sm"
                      className="mt-1.5"
                      disabled={!coach.canRevealHint}
                      onClick={coach.revealHint}
                    >
                      {coach.hintLevel === 0
                        ? 'Demander un indice'
                        : coach.hintLevel >= coach.maxHintLevel
                          ? 'Indice complet'
                          : 'Indice suivant'}
                    </Button>
                  </Box>
                )}

                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={game.undo}
                    disabled={game.sanHistory.length === 0}
                  >
                    Annuler
                  </Button>
                  <Button variant="secondary" size="sm" onClick={coach.newGame}>
                    Nouvelle partie
                  </Button>
                  <Button variant="quiet" size="sm" onClick={coach.flipBoard}>
                    Retourner le plateau
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={game.sanHistory.length === 0}
                    onClick={coach.enterReplay}
                  >
                    Revoir la partie
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
