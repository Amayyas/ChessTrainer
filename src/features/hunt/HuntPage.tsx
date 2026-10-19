import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Button, PageHeader, Tag } from '@/components/UI'
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

const PANEL_HEAD = 'text-kicker font-semibold uppercase'

/**
 * A box score: each figure over its name, the columns ruled apart. A figure
 * marked `urgent` — the last ten seconds — is set in the rubric, which marks
 * what needs attention; nothing else is, good news included.
 */
function Figures({
  figures,
  className,
}: {
  figures: Array<{ label: string; value: string; urgent?: boolean }>
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-2 border-y border-ink/30 sm:grid-cols-4', className)}>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex flex-col-reverse justify-end py-3 even:border-l even:border-ink/30 even:pl-3 sm:border-l sm:border-ink/30 sm:pl-3 sm:first:border-l-0 sm:first:pl-0"
        >
          <dt className="text-caption text-ink-soft">{figure.label}</dt>
          <dd
            className={cn(
              'text-heading font-semibold tabular-nums lining-nums',
              figure.urgent && 'text-rubric',
            )}
          >
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
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
        <Box className="mx-auto flex max-w-2xl flex-col gap-4">
          <h2 className={PANEL_HEAD}>Choisissez votre championne</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {CHAMPIONS.map((champion) => (
              <button
                key={champion}
                type="button"
                onClick={() => startRound(champion)}
                className="flex items-start gap-3.5 border border-ink/30 p-3 text-left transition-colors hover:border-ink"
              >
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 text-center font-figurine text-[2.25rem] leading-none"
                >
                  {GLYPHS[champion]}
                </span>
                <span>
                  <span className="block text-heading font-semibold">
                    {CHAMPION_LABELS[champion]}
                  </span>
                  <span className="block text-caption">{CHAMPION_DESCRIPTIONS[champion]}</span>
                  <span className="mt-1 block text-caption italic text-ink-soft">
                    Record : {personalBest(scoreboard, champion)} pts
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Box>
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
        <Box className="mx-auto flex max-w-xl flex-col gap-4">
          <Figures
            className="sm:grid-cols-3"
            figures={[
              { label: 'Score', value: String(game.score) },
              { label: 'Captures', value: String(game.captures) },
              { label: 'Record', value: String(displayedBest) },
            ]}
          />

          <p className="text-body italic">
            {encouragement(game.score, previousBest, game.captures)}
          </p>

          {submitFailed && (
            <p role="alert" className="bg-rubric px-3 py-2 text-caption text-paper-bright">
              Score enregistré localement, mais son envoi au classement mondial a échoué. Il sera
              renvoyé à la prochaine manche.
            </p>
          )}

          {!session && game.score > 0 && (
            <p className="text-caption">
              Ce score pourrait figurer au classement mondial —{' '}
              <Link
                to={ROUTES.register}
                className="font-semibold underline underline-offset-4 transition-colors hover:text-rubric"
              >
                créez un compte
              </Link>{' '}
              pour l'y inscrire.
            </p>
          )}

          <div>
            <h2 className={cn(PANEL_HEAD, 'mb-2')}>
              Meilleurs scores — {CHAMPION_LABELS[champion]}
            </h2>
            {rows.length === 0 ? (
              <p className="text-caption italic text-ink-soft">Aucun score enregistré.</p>
            ) : (
              <ol>
                {rows.map((row, index) => (
                  <li
                    key={row.playedAt}
                    className="flex justify-between gap-3 border-t border-ink/30 py-1.5 text-caption first:border-t-0"
                  >
                    <span className="text-ink-soft">
                      {index + 1}. {new Date(row.playedAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="tabular-nums lining-nums">
                      {row.score} pts · {row.captures} captures
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => startRound(champion)}>Rejouer</Button>
            <Button variant="secondary" onClick={game.reset}>
              Changer de pièce
            </Button>
          </div>
        </Box>
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
            <Tag tone="alert">En danger — bougez !</Tag>
          ) : (
            <Tag tone="muted">{CHAMPION_DESCRIPTIONS[champion].split(',')[0]}</Tag>
          )
        }
      />

      <div className="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <div className="mx-auto w-full max-w-[600px] self-start lg:pr-12">
          <HuntBoard
            champion={champion}
            championSquare={game.championSquare}
            enemies={game.enemies}
            moves={game.moves}
            threats={game.threats}
            onMove={game.moveTo}
          />
        </div>

        <div className="flex flex-col gap-[22px] lg:border-l lg:border-ink/30 lg:pl-11">
          <Figures
            figures={[
              { label: 'Temps', value: `${seconds} s`, urgent: seconds <= 10 },
              { label: 'Score', value: String(game.score) },
              { label: 'Captures', value: String(game.captures) },
              { label: 'Combo', value: game.combo > 1 ? `×${game.combo}` : '—' },
            ]}
          />

          <div className="flex items-baseline justify-between">
            <span className={PANEL_HEAD}>Vies</span>
            <span aria-label={`${game.lives} vies restantes`} className="text-heading">
              {'♥'.repeat(Math.max(0, game.lives))}
              <span className="text-ink/20">
                {'♥'.repeat(Math.max(0, STARTING_LIVES - game.lives))}
              </span>
            </span>
          </div>

          <p className="text-caption italic text-ink-soft">
            Cliquez une case atteignable pour vous déplacer. Une pièce en rouge peut vous capturer.
          </p>

          <div>
            <Button variant="quiet" size="sm" onClick={game.reset}>
              Abandonner la manche
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
