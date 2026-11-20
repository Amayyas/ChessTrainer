import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
import Input from '@/components/UI/Input'
import {
  LichessImportError,
  fetchRecentGames,
  type LichessError,
  type LichessGame,
} from '@/features/coach/lichess'
import { ROUTES } from '@/routes'

const ERRORS: Record<LichessError, string> = {
  invalid: 'Ce pseudo n’est pas un pseudo Lichess valide.',
  unknown: 'Aucun joueur de ce nom sur Lichess.',
  'rate-limited': 'Lichess limite les demandes : réessayez dans une minute.',
  unreachable: 'Lichess ne répond pas. Réessayez plus tard.',
}

const DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** The game's result from the searched player's side: their win, their loss, or a draw. */
function resultFor(game: LichessGame, player: string): string {
  if (game.winner === null) return 'Nulle'
  const side = game.white.toLowerCase() === player.toLowerCase() ? 'w' : 'b'
  return game.winner === side ? 'Victoire' : 'Défaite'
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'games'; games: LichessGame[]; player: string }

/**
 * A player's recent Lichess games, one of which goes to the coach for review.
 * The game is handed over the way the battle mode hands one over — in router
 * state — so the coach opens it in review at its first move.
 */
export default function LichessImport() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const pending = useRef<AbortController | null>(null)

  const search = async (event: FormEvent) => {
    event.preventDefault()
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setState({ kind: 'loading' })
    try {
      const games = await fetchRecentGames(username, { signal: controller.signal })
      setState({ kind: 'games', games, player: username.trim() })
    } catch (error) {
      if (controller.signal.aborted) return
      const reason = error instanceof LichessImportError ? error.reason : 'unreachable'
      setState({ kind: 'error', message: ERRORS[reason] })
    }
  }

  const open = (game: LichessGame) => {
    navigate(ROUTES.coach, { state: { pgn: game.pgn } })
  }

  return (
    <section aria-labelledby="t-lichess" className="mt-5">
      <h2 id="t-lichess" className="text-caption font-semibold">
        Importer une partie depuis Lichess
      </h2>
      <form onSubmit={search} className="mt-1.5 flex gap-2">
        <label htmlFor="lichess-username" className="sr-only">
          Pseudo Lichess
        </label>
        <Input
          id="lichess-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Votre pseudo Lichess"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 text-caption"
        />
        <Button type="submit" disabled={state.kind === 'loading' || username.trim() === ''}>
          {state.kind === 'loading' ? 'Recherche…' : 'Chercher'}
        </Button>
      </form>

      <div role="status" className="mt-2">
        {state.kind === 'error' && <p className="text-caption text-rubric">{state.message}</p>}
        {state.kind === 'games' && state.games.length === 0 && (
          <p className="text-caption italic text-ink-soft">Aucune partie récente à importer.</p>
        )}
      </div>

      {state.kind === 'games' && state.games.length > 0 && (
        <ol className="mt-1">
          {state.games.map((game) => (
            <li key={game.id} className="border-t border-ink/30 first:border-t-0">
              <button
                type="button"
                onClick={() => open(game)}
                className="group flex w-full items-baseline justify-between gap-3 py-2 text-left text-caption"
              >
                <span className="min-w-0 truncate transition-colors group-hover:text-rubric">
                  {game.white} – {game.black}
                </span>
                <span className="shrink-0 italic text-ink-soft">
                  {resultFor(game, state.player)} · {game.speed} · {DAY.format(game.playedAt)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-caption italic text-ink-soft">
        Votre pseudo est envoyé à Lichess pour lire vos parties publiques, rien d’autre.
      </p>
    </section>
  )
}
