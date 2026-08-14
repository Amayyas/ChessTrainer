import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, PageHeader } from '@/components/UI'
import LevelBar from '@/features/progression/LevelBar'
import { BADGES } from '@/features/progression/badges'
import { levelFromXp } from '@/features/progression/levels'
import {
  AVATAR_GLYPHS,
  AVATAR_PIECES,
  isSupabaseConfigured,
  type AvatarPiece,
} from '@/lib/supabase'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'
import { useProgressionStore } from '@/store/useProgressionStore'
import { cn } from '@/utils/cn'

/**
 * Profile (spec section 2.5): level, global statistics and the badge
 * collection. The account details of section 2.6 — pseudonym, avatar, sign-up
 * date — arrive with authentication in M10.
 */
export default function ProfilePage() {
  const xp = useProgressionStore((state) => state.xp)
  const stats = useProgressionStore((state) => state.stats)
  const unlocked = useProgressionStore((state) => state.unlockedBadges)
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const authProfile = useAuthStore((state) => state.profile)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const signOut = useAuthStore((state) => state.signOut)
  const deleteAccount = useAuthStore((state) => state.deleteAccount)
  const authError = useAuthStore((state) => state.error)

  // Deleting is irreversible and cascades, so it asks for the username to be
  // typed out: a confirm dialog is dismissed by reflex, this cannot be.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [typedUsername, setTypedUsername] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const progress = levelFromXp(xp)
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : null

  const figures = [
    { label: 'Parties jouées', value: String(stats.gamesPlayed) },
    { label: 'Victoires', value: winRate === null ? '—' : `${stats.gamesWon} (${winRate}%)` },
    {
      label: 'Précision moyenne',
      value: stats.averageAccuracy === null ? '—' : `${stats.averageAccuracy}%`,
    },
    { label: 'Puzzles résolus', value: String(stats.puzzlesSolved) },
    { label: 'Meilleure série', value: `${stats.bestPuzzleStreak} j` },
    { label: 'Record Chasse', value: String(stats.bestHuntScore) },
  ]

  return (
    <div>
      <PageHeader
        title="Profil"
        subtitle="Votre progression, vos statistiques et vos badges."
        actions={<Badge variant="gold">Niveau {progress.level}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-bold text-ebene">Compte</h2>
            {!isSupabaseConfigured ? (
              <p className="text-sm text-ardoise">
                Aucun serveur n'est configuré : vous jouez en invité et votre progression reste sur
                cet appareil.
              </p>
            ) : !isReady || (session && !authProfile) ? (
              // The stored session, then the profile, are both fetched on
              // start-up. Falling through to the guest block meanwhile would
              // invite a signed-in player to create a second account.
              <p className="text-sm text-ardoise">Chargement de votre compte…</p>
            ) : session && authProfile ? (
              <>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-ebene text-2xl text-or"
                  >
                    {AVATAR_GLYPHS[authProfile.avatar_piece]}
                  </span>
                  <span>
                    <span className="block font-semibold text-ebene">{authProfile.username}</span>
                    <span className="block text-xs text-ardoise">
                      Inscrit le {new Date(authProfile.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-ardoise">Avatar</p>
                  <div role="group" aria-label="Choisir un avatar" className="flex flex-wrap gap-1">
                    {AVATAR_PIECES.map((piece: AvatarPiece) => (
                      <button
                        key={piece}
                        type="button"
                        aria-pressed={authProfile.avatar_piece === piece}
                        onClick={() => void updateProfile({ avatar_piece: piece })}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors',
                          authProfile.avatar_piece === piece
                            ? 'bg-or/25 text-ebene'
                            : 'bg-ebene/5 text-ardoise hover:text-ebene',
                        )}
                      >
                        {AVATAR_GLYPHS[piece]}
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => void signOut()}>
                  Se déconnecter
                </Button>

                <div className="mt-2 border-t border-ebene/10 pt-4">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="text-sm text-red-700 underline underline-offset-2 hover:text-red-800"
                    >
                      Supprimer mon compte
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-xl bg-red-50 p-3">
                      <p className="text-sm text-red-800">
                        Cette action est <strong>définitive</strong>. Votre compte, vos scores du
                        classement, votre progression et vos badges seront effacés. Il n'y a pas de
                        retour en arrière.
                      </p>
                      <label className="text-sm text-red-800">
                        Saisissez <strong>{authProfile.username}</strong> pour confirmer :
                        <input
                          type="text"
                          value={typedUsername}
                          onChange={(event) => setTypedUsername(event.target.value)}
                          autoComplete="off"
                          className="mt-1 h-10 w-full rounded-lg border border-red-300 bg-white px-3 text-ebene outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        />
                      </label>
                      {authError && (
                        <p role="alert" className="text-sm font-medium text-red-800">
                          {authError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmingDelete(false)
                            setTypedUsername('')
                          }}
                        >
                          Annuler
                        </Button>
                        <button
                          type="button"
                          disabled={typedUsername !== authProfile.username || isDeleting}
                          onClick={() => {
                            setIsDeleting(true)
                            void deleteAccount().finally(() => setIsDeleting(false))
                          }}
                          className="inline-flex h-9 items-center rounded-xl bg-red-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-ardoise">
                  Vous jouez en invité. Un compte vous ouvre le classement mondial et retrouve vos
                  progrès sur tous vos appareils.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={ROUTES.register}
                    className="inline-flex h-10 items-center rounded-xl bg-or px-4 text-sm font-semibold text-ebene"
                  >
                    Créer un compte
                  </Link>
                  <Link
                    to={ROUTES.login}
                    className="inline-flex h-10 items-center rounded-xl border border-ebene/20 px-4 text-sm font-semibold text-ebene"
                  >
                    Se connecter
                  </Link>
                </div>
              </>
            )}
          </Card>

          <Card>
            <LevelBar progress={progress} />
            <p className="mt-2 text-sm text-ardoise">{xp} XP au total</p>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-bold text-ebene">Statistiques</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {figures.map((figure) => (
                <div key={figure.label} className="rounded-xl bg-ebene/5 px-3 py-2 text-center">
                  <dd className="font-display text-xl font-bold text-ebene">{figure.value}</dd>
                  <dt className="text-xs text-ardoise">{figure.label}</dt>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-1 font-display text-lg font-bold text-ebene">Badges</h2>
          <p className="mb-3 text-xs text-ardoise">
            {unlocked.length} sur {BADGES.length} débloqués
          </p>
          <ul className="space-y-2">
            {BADGES.map((badge) => {
              const isUnlocked = unlocked.includes(badge.id)
              return (
                <li
                  key={badge.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl px-3 py-2',
                    isUnlocked ? 'bg-or/15' : 'bg-ebene/5',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('text-xl leading-none', !isUnlocked && 'opacity-30 grayscale')}
                  >
                    {badge.glyph}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-sm font-semibold',
                        isUnlocked ? 'text-ebene' : 'text-ardoise',
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="block text-xs text-ardoise">{badge.description}</span>
                  </span>
                  <span className="sr-only">{isUnlocked ? 'Débloqué' : 'Verrouillé'}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
