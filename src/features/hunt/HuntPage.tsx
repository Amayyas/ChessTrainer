import { useEffect, useRef } from 'react'
import { Badge, Button, Card, PageHeader } from '@/components/UI'
import HuntBoard from '@/features/hunt/HuntBoard'
import { CHAMPION_DESCRIPTIONS, CHAMPION_LABELS, type ChampionType } from '@/features/hunt/board'
import {
  STARTING_LIVES,
  addScore,
  encouragement,
  personalBest,
  type Scoreboard,
} from '@/features/hunt/scoring'
import { useHuntGame } from '@/features/hunt/useHuntGame'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useProgressionStore } from '@/store/useProgressionStore'
import { cn } from '@/utils/cn'

const CHAMPIONS: ChampionType[] = ['q', 'r', 'b', 'n']
const GLYPHS: Record<ChampionType, string> = { q: '♛', r: '♜', b: '♝', n: '♞' }

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl px-3 py-2 text-center', accent ? 'bg-or/20' : 'bg-ebene/5')}>
      <p className="font-display text-xl font-bold tabular-nums text-ebene">{value}</p>
      <p className="text-xs text-ardoise">{label}</p>
    </div>
  )
}

/**
 * Piece Hunt (spec section 2.4): capture as many enemies as possible in sixty
 * seconds with a single champion, without being taken.
 */
export default function HuntPage() {
  const game = useHuntGame()
  const [scoreboard, setScoreboard] = useLocalStorage<Scoreboard>('chesstrainer.hunt.scores', {})
  const recordHunt = useProgressionStore((state) => state.recordHunt)

  // Record the round once, when it ends.
  const recorded = useRef(false)
  // The best from before this round: `scoreboard` gains the fresh score
  // asynchronously, so reading it directly would flash a stale record and the
  // wrong encouragement on the first frame of the results screen.
  const bestBeforeRound = useRef(0)
  useEffect(() => {
    if (game.phase !== 'over') {
      recorded.current = false
      return
    }
    if (recorded.current || !game.champion) return
    recorded.current = true
    bestBeforeRound.current = personalBest(scoreboard, game.champion)
    recordHunt({
      score: game.score,
      captures: game.captures,
      championLabel: CHAMPION_LABELS[game.champion],
    })
    setScoreboard((board) =>
      addScore(board, {
        champion: game.champion!,
        score: game.score,
        captures: game.captures,
        playedAt: new Date().toISOString(),
      }),
    )
  }, [game.phase, game.champion, game.score, game.captures, scoreboard, setScoreboard, recordHunt])

  if (game.phase === 'setup') {
    return (
      <div>
        <PageHeader
          title="Chasse aux Pièces"
          subtitle="Capturez un maximum de pièces en 60 secondes, avec une seule pièce et 3 vies."
        />
        <Card className="mx-auto flex max-w-2xl flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-ebene">Choisissez votre championne</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {CHAMPIONS.map((champion) => (
              <button
                key={champion}
                type="button"
                onClick={() => game.start(champion)}
                className="flex items-start gap-3 rounded-xl border border-ebene/15 p-3 text-left transition-colors hover:border-or hover:bg-or/10"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ebene text-2xl text-or"
                >
                  {GLYPHS[champion]}
                </span>
                <span>
                  <span className="block font-semibold text-ebene">
                    {CHAMPION_LABELS[champion]}
                  </span>
                  <span className="block text-xs text-ardoise">
                    {CHAMPION_DESCRIPTIONS[champion]}
                  </span>
                  <span className="mt-1 block text-xs text-ardoise">
                    Record : {personalBest(scoreboard, champion)} pts
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const champion = game.champion!

  if (game.phase === 'over') {
    const rows = scoreboard[champion] ?? []
    const previousBest = bestBeforeRound.current
    const displayedBest = Math.max(previousBest, game.score)
    return (
      <div>
        <PageHeader title="Chasse aux Pièces" subtitle="Manche terminée." />
        <Card className="mx-auto flex max-w-xl flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Score" value={String(game.score)} accent />
            <Stat label="Captures" value={String(game.captures)} />
            <Stat label="Record" value={String(displayedBest)} />
          </div>

          <p className="text-sm text-ardoise">
            {encouragement(game.score, previousBest, game.captures)}
          </p>

          <div>
            <h2 className="mb-2 font-display text-lg font-bold text-ebene">
              Meilleurs scores — {CHAMPION_LABELS[champion]}
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-ardoise">Aucun score enregistré.</p>
            ) : (
              <ol className="divide-y divide-ebene/10 text-sm">
                {rows.map((row, index) => (
                  <li key={row.playedAt} className="flex justify-between py-1.5">
                    <span className="text-ardoise">
                      {index + 1}. {new Date(row.playedAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-ebene">
                      {row.score} pts · {row.captures} captures
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => game.start(champion)}>Rejouer</Button>
            <Button variant="outline" onClick={game.reset}>
              Changer de pièce
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const seconds = Math.ceil(game.timeLeftMs / 1000)
  const inDanger = game.threats.length > 0

  return (
    <div>
      <PageHeader
        title="Chasse aux Pièces"
        subtitle={`${CHAMPION_LABELS[champion]} — capturez sans vous faire prendre.`}
        actions={
          inDanger ? (
            <Badge variant="danger">En danger — bougez !</Badge>
          ) : (
            <Badge variant="neutral">{CHAMPION_DESCRIPTIONS[champion].split(',')[0]}</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="mx-auto w-full max-w-[560px] self-start">
          <HuntBoard
            champion={champion}
            championSquare={game.championSquare}
            enemies={game.enemies}
            moves={game.moves}
            threats={game.threats}
            onMove={game.moveTo}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Temps" value={`${seconds} s`} accent={seconds <= 10} />
              <Stat label="Score" value={String(game.score)} />
              <Stat label="Captures" value={String(game.captures)} />
              <Stat
                label="Combo"
                value={game.combo > 1 ? `×${game.combo}` : '—'}
                accent={game.combo > 1}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-ardoise">Vies</span>
              <span aria-label={`${game.lives} vies restantes`} className="text-lg">
                {'♥'.repeat(Math.max(0, game.lives))}
                <span className="text-ebene/20">
                  {'♥'.repeat(Math.max(0, STARTING_LIVES - game.lives))}
                </span>
              </span>
            </div>

            <p className="text-xs text-ardoise">
              Cliquez une case atteignable pour vous déplacer. Une pièce en rouge peut vous
              capturer.
            </p>

            <Button variant="ghost" size="sm" onClick={game.reset}>
              Abandonner la manche
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
