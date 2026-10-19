import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChessBoard, MoveHistory } from '@/components/Board'
import { Box, Button, PageHeader, Tag } from '@/components/UI'
import StatusLine from '@/components/UI/StatusLine'
import BattleSetup from '@/features/battle/BattleSetup'
import ClockDisplay from '@/features/battle/ClockDisplay'
import { useBattleGame } from '@/features/battle/useBattleGame'
import { ROUTES } from '@/routes'
import { useProgressionStore } from '@/store/useProgressionStore'
import { describeStatus } from '@/utils/chess'

/**
 * Battle mode: play Stockfish at one of five calibrated
 * levels, with your chosen colour and an optional clock.
 */
export default function BattlePage() {
  const battle = useBattleGame()
  const navigate = useNavigate()
  const { game, clock, level, playerColor, phase, result } = battle

  // Stamped the moment the game ends, so reviewing it later does not move it.
  const endedAt = useRef<string | null>(null)
  useEffect(() => {
    if (result && endedAt.current === null) endedAt.current = new Date().toISOString()
    if (!result) endedAt.current = null
  }, [result])
  const recordBattle = useProgressionStore((state) => state.recordBattle)

  // Award XP once, when the game ends.
  const recorded = useRef(false)
  useEffect(() => {
    if (phase !== 'over') {
      recorded.current = false
      return
    }
    if (recorded.current || !result) return
    recorded.current = true
    recordBattle({
      outcome: result.outcome,
      byCheckmate: game.status.reason === 'checkmate',
      levelLabel: level.label,
    })
  }, [phase, result, game.status.reason, level.label, recordBattle])

  const stalled = !battle.isThinking && battle.isEngineStalled && phase === 'playing'
  const playerLabel = playerColor === 'w' ? 'Vous (blancs)' : 'Vous (noirs)'
  const engineLabel = playerColor === 'w' ? `IA (noirs)` : `IA (blancs)`
  const playerMs = playerColor === 'w' ? clock.whiteMs : clock.blackMs
  const engineMs = playerColor === 'w' ? clock.blackMs : clock.whiteMs

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader
          title="Affrontement"
          subtitle="Choisissez un niveau, votre couleur et une cadence, puis défiez l'IA."
        />
        <BattleSetup onStart={battle.start} disabled={!battle.isEngineReady} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Affrontement"
        subtitle={`Niveau ${level.id} — ${level.label} (~${level.elo} Elo)`}
        actions={
          // One status line whatever it says, so a screen reader hears each
          // change, the stall included.
          <StatusLine busy={battle.isThinking} alert={stalled}>
            {battle.isThinking
              ? "L'IA réfléchit…"
              : stalled
                ? "L'IA ne répond plus"
                : describeStatus(game.status, game.turn)}
          </StatusLine>
        }
      />

      <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
          <ChessBoard
            fen={game.fen}
            turn={game.turn}
            orientation={playerColor === 'w' ? 'white' : 'black'}
            interactive={phase === 'playing' && game.turn === playerColor}
            onMove={battle.playerMove}
            getLegalTargets={game.getLegalTargets}
            isPromotion={game.isPromotion}
            lastMove={game.lastMove}
            checkSquare={game.checkSquare}
          />
        </div>

        <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
          {result && (
            <Box className="flex flex-col gap-3">
              <div>
                <h2 className="text-kicker font-semibold uppercase">Partie terminée</h2>
                <p className="mt-1 text-body italic">{result.label}</p>
              </div>
              <Tag tone="ink">
                {result.outcome === 'win'
                  ? 'Victoire'
                  : result.outcome === 'loss'
                    ? 'Défaite'
                    : 'Nulle'}
              </Tag>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  size="sm"
                  disabled={game.sanHistory.length === 0}
                  onClick={() =>
                    // The colour travels with the game: the coach grades only
                    // the side the player actually chose, never the engine's.
                    navigate(ROUTES.coach, {
                      state: {
                        pgn: game.pgn,
                        playerColor,
                        // The level and the result travel too: 60% against
                        // Maître and 60% against Novice are not the same 60%.
                        levelLabel: level.label,
                        outcome: result?.outcome,
                      },
                    })
                  }
                >
                  Analyser dans le Coach
                </Button>
                <Button variant="secondary" size="sm" onClick={battle.backToSetup}>
                  Nouvelle partie
                </Button>
              </div>
            </Box>
          )}

          <div className="flex flex-col gap-[22px]">
            {clock.enabled && (
              <div className="flex flex-col gap-2">
                <ClockDisplay
                  label={engineLabel}
                  ms={engineMs}
                  isActive={clock.active !== null && clock.active !== playerColor}
                />
                <ClockDisplay
                  label={playerLabel}
                  ms={playerMs}
                  isActive={clock.active === playerColor}
                />
              </div>
            )}

            <section aria-labelledby="t-moves">
              <h2 id="t-moves" className="mb-1 text-kicker font-semibold uppercase">
                Coups joués
              </h2>
              <MoveHistory moves={game.sanHistory} />
            </section>

            {/* Only while a game is still on: once it has a verdict, the card
                above says so, and two panels offering a new game is one too
                many. */}
            {battle.isEngineStalled && phase === 'playing' && (
              <div className="flex flex-col gap-2">
                <p className="text-caption italic text-ink-soft">
                  L&apos;IA n&apos;a pas répondu malgré plusieurs tentatives. La partie ne peut pas
                  se poursuivre.
                </p>
                <Button variant="secondary" size="sm" onClick={battle.backToSetup}>
                  Nouvelle partie
                </Button>
              </div>
            )}

            {phase === 'playing' && (
              <div>
                <Button variant="secondary" size="sm" onClick={battle.resign}>
                  Abandonner
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
