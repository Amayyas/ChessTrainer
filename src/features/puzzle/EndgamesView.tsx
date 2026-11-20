import { useState } from 'react'
import { BoardControls, ChessBoard, MoveInput } from '@/components/Board'
import { Box, Button, PageHeader, Tag } from '@/components/UI'
import StatusLine from '@/components/UI/StatusLine'
import { ENDGAMES, GOAL_LABELS, type Endgame } from '@/features/puzzle/endgames'
import { HOLD_MOVES, useEndgameSession } from '@/features/puzzle/useEndgameSession'
import { useProgressionStore } from '@/store/useProgressionStore'
import { describeStatus } from '@/utils/chess'
import { cn } from '@/utils/cn'

const PANEL_HEAD = 'text-kicker font-semibold uppercase'

/** The side the player takes, as the column names it. */
const SIDES = { w: 'les blancs', b: 'les noirs' } as const

/** The list: each endgame, its goal, and whether it is mastered. */
function EndgameList({
  mastered,
  onChoose,
}: {
  mastered: readonly string[]
  onChoose: (endgame: Endgame) => void
}) {
  const count = ENDGAMES.filter((endgame) => mastered.includes(endgame.id)).length
  return (
    <div>
      <PageHeader
        title="Puzzles"
        subtitle={`Finales à connaître — ${count} sur ${ENDGAMES.length} maîtrisée${count > 1 ? 's' : ''}.`}
      />
      <ol className="mx-auto flex max-w-2xl flex-col">
        {ENDGAMES.map((endgame) => {
          const isMastered = mastered.includes(endgame.id)
          return (
            <li key={endgame.id} className="border-t border-ink/30 py-3 first:border-t-0">
              <button
                type="button"
                onClick={() => onChoose(endgame)}
                className="group flex w-full items-baseline justify-between gap-4 text-left"
              >
                <span>
                  <span className="block text-heading transition-colors group-hover:text-rubric">
                    {endgame.title}
                  </span>
                  <span className="text-caption italic text-ink-soft">
                    {GOAL_LABELS[endgame.goal]}
                  </span>
                </span>
                <Tag tone={isMastered ? 'ink' : 'muted'}>
                  {isMastered ? 'Maîtrisée' : 'À travailler'}
                </Tag>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** One endgame on the board, against the engine. */
function EndgameBoard({ endgame, onBack }: { endgame: Endgame; onBack: () => void }) {
  const session = useEndgameSession(endgame)
  const { game, player, status } = session
  const playing = status === 'playing'
  const yourTurn = playing && game.turn === player && !session.isThinking

  return (
    <div>
      <PageHeader
        title="Puzzles"
        subtitle={endgame.title}
        actions={
          <StatusLine busy={session.isThinking || !session.isEngineReady}>
            {!session.isEngineReady
              ? 'Chargement de l’IA…'
              : session.isThinking
                ? 'L’IA réfléchit…'
                : describeStatus(game.status, game.turn)}
          </StatusLine>
        }
      />
      <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
          <ChessBoard
            fen={game.fen}
            turn={game.turn}
            orientation={player === 'w' ? 'white' : 'black'}
            interactive={yourTurn}
            onMove={session.playerMove}
            getLegalTargets={game.getLegalTargets}
            isPromotion={game.isPromotion}
            lastMove={game.lastMove}
            checkSquare={game.checkSquare}
            moves={game.history}
          />
          <BoardControls>
            <MoveInput
              fen={game.fen}
              turn={game.turn}
              enabled={yourTurn}
              onMove={session.playerMove}
              getLegalTargets={game.getLegalTargets}
              isPromotion={game.isPromotion}
              idleMessage={playing ? 'Ce n’est pas à vous de jouer.' : 'La finale est terminée.'}
            />
          </BoardControls>
        </div>

        <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
          <div>
            <h2 className={PANEL_HEAD}>Objectif</h2>
            <p className="mt-1 text-body">
              Vous jouez {SIDES[player]}. {GOAL_LABELS[endgame.goal]}
              {endgame.goal === 'hold' ? ` pendant ${HOLD_MOVES} coups` : ''}, contre l’IA à pleine
              force.
            </p>
            {endgame.goal === 'hold' && playing && (
              <p className="mt-1 text-caption italic text-ink-soft">
                Coups tenus : {Math.min(session.playerMoves, HOLD_MOVES)} / {HOLD_MOVES}
              </p>
            )}
          </div>

          <Box className="px-[22px] pb-4 pt-5">
            <h2 className={cn(PANEL_HEAD, 'mb-2')}>Le principe</h2>
            <p className="text-caption">{endgame.principle}</p>
          </Box>

          {!playing && (
            <div role="status" className="flex flex-col items-start gap-2">
              <Tag tone={status === 'won' ? 'ink' : 'alert'}>
                {status === 'won' ? 'Finale maîtrisée' : 'Pas encore'}
              </Tag>
              <p className="text-body italic">{session.message}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" variant={playing ? 'secondary' : 'primary'} onClick={session.restart}>
              {playing ? 'Recommencer' : 'Rejouer cette finale'}
            </Button>
            <Button size="sm" variant="quiet" onClick={onBack}>
              Toutes les finales
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The endgames to know: a list, then each one played against the engine until
 * it is won or held. The engine boots only once an endgame is opened.
 */
export default function EndgamesView() {
  const mastered = useProgressionStore((state) => state.puzzleProgress.endgamesMastered)
  const [current, setCurrent] = useState<Endgame | null>(null)

  if (!current) return <EndgameList mastered={mastered} onChoose={setCurrent} />
  return <EndgameBoard key={current.id} endgame={current} onBack={() => setCurrent(null)} />
}
