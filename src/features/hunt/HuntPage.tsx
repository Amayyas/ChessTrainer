import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, PageHeader } from '@/components/UI'
import HuntBoard from '@/features/hunt/HuntBoard'
import { CHAMPION_DESCRIPTIONS, CHAMPION_LABELS, type ChampionType } from '@/features/hunt/board'
import { STARTING_LIVES, addScore, encouragement, personalBest } from '@/features/hunt/scoring'
import { useHuntGame } from '@/features/hunt/useHuntGame'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'
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
 * Piece Hunt: capture as many enemies as possible in sixty
 * seconds with a single champion, without being taken.
 */
export default function HuntPage() {
  const game = useHuntGame()
  // Held in the progression store rather than a localStorage key of its own, so
  // the board follows the account instead of the browser.
  const scoreboard = useProgressionStore((state) => state.huntScores)
  const setScoreboard = useProgressionStore((state) => state.setHuntScores)
  const recordHunt = useProgressionStore((state) => state.recordHunt)
  const session = useAuthStore((state) => state.session)

  // The server's own handle on the round in progress. It is opened when play
  // starts, so the submission below can be checked against how long the round
  // actually lasted rather than against the two numbers it reports.
  const roundId = useRef<string | null>(null)

  const startRound = useCallback(
    (champion: ChampionType) => {
      roundId.current = null
      game.start(champion)
      const client = supabase
      if (!client || !session) return // a guest plays, nothing is filed
      void client.rpc('start_hunt_round').then(({ data, error }) => {
        if (error) {
          console.error('[hunt] could not open the round:', error.message)
          return
        }
        roundId.current = typeof data === 'string' ? data : null
      })
    },
    [game, session],
  )

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

  // Submitting to the worldwide table is tracked apart from the local record:
  // the session is restored asynchronously, so a short round can end before it
  // exists. Sharing one flag would drop the score for good; this effect simply
  // runs again once the session arrives.
  const submitted = useRef(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  useEffect(() => {
    if (game.phase !== 'over') {
      submitted.current = false
      setSubmitFailed(false)
      return
    }
    if (submitted.current || !supabase || !session || !game.champion || game.score <= 0) return
    // Without an open round there is nothing for the server to check the score
    // against, so it would be refused anyway.
    const round = roundId.current
    if (!round) return
    submitted.current = true

    const client = supabase
    // Through the database function rather than a direct insert: the client can
    // no longer write to `scores` at all, so the round is checked against what
    // the rules allow before it reaches the leaderboard. The author comes from
    // the session on the server side, never from here.
    void client
      .rpc('submit_hunt_score', {
        p_round: round,
        p_piece: game.champion,
        p_score: game.score,
        p_captures: game.captures,
      })
      .then(({ error }) => {
        // A silently dropped score looks like the leaderboard is broken, so the
        // failure is surfaced and a retry is allowed.
        if (error) {
          console.error('[hunt] score submission refused:', error.message)
          submitted.current = false
          setSubmitFailed(true)
        }
      })
  }, [game.phase, game.champion, game.score, game.captures, session])

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
                onClick={() => startRound(champion)}
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

          {submitFailed && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              Score enregistré localement, mais son envoi au classement mondial a échoué. Il sera
              renvoyé à la prochaine manche.
            </p>
          )}

          {!session && game.score > 0 && (
            <p className="rounded-xl bg-or/15 px-3 py-2 text-sm text-ebene">
              Ce score pourrait figurer au classement mondial —{' '}
              <Link to={ROUTES.register} className="font-semibold underline">
                créez un compte
              </Link>{' '}
              pour l'y inscrire.
            </p>
          )}

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
            <Button onClick={() => startRound(champion)}>Rejouer</Button>
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
