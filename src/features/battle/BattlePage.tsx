import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChessBoard, MoveHistory } from '@/components/Board'
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/UI'
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
        subtitle={`Niveau ${level.id} — ${level.label} · ${level.description}`}
        actions={
          battle.isThinking ? (
            <span className="flex items-center gap-2 text-sm text-ardoise">
              <Spinner size="sm" /> L'IA réfléchit…
            </span>
          ) : (
            <Badge variant="neutral">{describeStatus(game.status, game.turn)}</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mx-auto w-full max-w-[560px] self-start">
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

        <div className="flex flex-col gap-4">
          {result && (
            <Card className="flex flex-col gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ebene">Partie terminée</h2>
                <p className="mt-1 text-sm text-ardoise">{result.label}</p>
              </div>
              <Badge
                variant={
                  result.outcome === 'win'
                    ? 'success'
                    : result.outcome === 'loss'
                      ? 'danger'
                      : 'gold'
                }
              >
                {result.outcome === 'win'
                  ? 'Victoire'
                  : result.outcome === 'loss'
                    ? 'Défaite'
                    : 'Nulle'}
              </Badge>
              <div className="flex flex-wrap gap-2">
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
                <Button variant="outline" size="sm" onClick={battle.backToSetup}>
                  Nouvelle partie
                </Button>
              </div>
            </Card>
          )}

          <Card className="flex h-fit flex-col gap-4">
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

            <div>
              <h2 className="mb-2 font-display text-lg font-bold text-ebene">Coups joués</h2>
              <MoveHistory moves={game.sanHistory} />
            </div>

            {phase === 'playing' && (
              <Button variant="secondary" size="sm" onClick={battle.resign}>
                Abandonner
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
