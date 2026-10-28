import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, PageHeader, Tag } from '@/components/UI'
import BoxScore from '@/components/UI/BoxScore'
import Input from '@/components/UI/Input'
import { ToggleGroup, ToggleGroupItem } from '@/components/UI/ToggleGroup'
import AccuracyHistoryPanel from '@/features/progression/AccuracyHistoryPanel'
import UsernameForm from '@/features/profile/UsernameForm'
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
import { formatPercent } from '@/utils/format'

/**
 * Profile: level, global statistics and the badge collection, and for a
 * signed-in player the account itself — pseudonym, avatar, sign-up date.
 */
const COLUMN_HEAD = 'text-kicker font-semibold uppercase'

export default function ProfilePage() {
  const xp = useProgressionStore((state) => state.xp)
  const stats = useProgressionStore((state) => state.stats)
  const unlocked = useProgressionStore((state) => state.unlockedBadges)
  const accuracyHistory = useProgressionStore((state) => state.accuracyHistory)
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const authProfile = useAuthStore((state) => state.profile)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const signOut = useAuthStore((state) => state.signOut)
  const deleteAccount = useAuthStore((state) => state.deleteAccount)
  const deleteError = useAuthStore((state) => state.deleteError)
  const clearDeleteError = useAuthStore((state) => state.clearDeleteError)

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
    {
      label: 'Victoires',
      value: winRate === null ? '—' : `${stats.gamesWon} (${formatPercent(winRate)})`,
    },
    {
      label: 'Précision moyenne',
      value: stats.battleAccuracy === null ? '—' : formatPercent(stats.battleAccuracy),
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
        actions={<Tag tone="ink">Niveau {progress.level}</Tag>}
      />

      <div className="grid gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-12 lg:pr-14">
          <section aria-labelledby="t-account" className="flex flex-col gap-4">
            <h2 id="t-account" className={COLUMN_HEAD}>
              Compte
            </h2>
            {!isSupabaseConfigured ? (
              <p className="text-caption italic text-ink-soft">
                Aucun serveur n'est configuré : vous jouez en invité et votre progression reste sur
                cet appareil.
              </p>
            ) : !isReady || (session && !authProfile) ? (
              // The stored session, then the profile, are both fetched on
              // start-up. Falling through to the guest block meanwhile would
              // invite a signed-in player to create a second account.
              <p className="text-caption italic text-ink-soft">Chargement de votre compte…</p>
            ) : session && authProfile ? (
              <>
                <div className="flex items-center gap-4">
                  <span aria-hidden="true" className="font-figurine text-[2.75rem] leading-none">
                    {AVATAR_GLYPHS[authProfile.avatar_piece]}
                  </span>
                  <span>
                    <span className="block text-heading font-semibold">{authProfile.username}</span>
                    <span className="block text-caption italic text-ink-soft">
                      Inscrit le {new Date(authProfile.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                </div>

                <UsernameForm current={authProfile.username} />

                <div>
                  <p className="mb-1.5 text-caption font-semibold">Avatar</p>
                  <ToggleGroup
                    type="single"
                    variant="tiles"
                    value={authProfile.avatar_piece}
                    // Pressing the current avatar again would ask the server to
                    // store no avatar at all.
                    onValueChange={(next) => {
                      if (next) void updateProfile({ avatar_piece: next as AvatarPiece })
                    }}
                    aria-label="Choisir un avatar"
                  >
                    {AVATAR_PIECES.map((piece: AvatarPiece) => (
                      <ToggleGroupItem key={piece} value={piece}>
                        {AVATAR_GLYPHS[piece]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div>
                  <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                    Se déconnecter
                  </Button>
                </div>

                <div className="border-t border-ink/30 pt-3">
                  {!confirmingDelete ? (
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => {
                        clearDeleteError()
                        setConfirmingDelete(true)
                      }}
                      className="text-rubric hover:text-ink"
                    >
                      Supprimer mon compte
                    </Button>
                  ) : (
                    // The one destructive act on the site, so it is set apart
                    // in the rubric, which marks what needs acting on.
                    <div className="flex flex-col gap-3 border border-rubric bg-paper-bright p-4">
                      <p className="text-caption">
                        Cette action est <strong>définitive</strong>. Votre compte, vos scores du
                        classement, votre progression et vos badges seront effacés. Il n'y a pas de
                        retour en arrière.
                      </p>
                      <label className="text-caption">
                        Saisissez <strong>{authProfile.username}</strong> pour confirmer :
                        <Input
                          type="text"
                          value={typedUsername}
                          onChange={(event) => setTypedUsername(event.target.value)}
                          autoComplete="off"
                          className="mt-1.5"
                        />
                      </label>
                      {deleteError && (
                        <p role="alert" className="text-caption font-semibold text-rubric">
                          {deleteError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setConfirmingDelete(false)
                            setTypedUsername('')
                            clearDeleteError()
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          disabled={typedUsername !== authProfile.username || isDeleting}
                          isLoading={isDeleting}
                          onClick={() => {
                            setIsDeleting(true)
                            void deleteAccount().finally(() => setIsDeleting(false))
                          }}
                          className="bg-rubric text-paper-bright hover:bg-ink"
                        >
                          {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-caption italic text-ink-soft">
                  Vous jouez en invité. Un compte vous ouvre le classement mondial et retrouve vos
                  progrès sur tous vos appareils.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button asChild>
                    <Link to={ROUTES.register}>Créer un compte</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to={ROUTES.login}>Se connecter</Link>
                  </Button>
                </div>
              </>
            )}
          </section>

          <section aria-labelledby="t-progression">
            <h2 id="t-progression" className={cn(COLUMN_HEAD, 'mb-3')}>
              Progression
            </h2>
            <LevelBar progress={progress} />
            <p className="mt-2 text-caption italic text-ink-soft">{xp} XP au total</p>

            <BoxScore figures={figures} columns={3} rule="ink" className="mt-8" />
          </section>

          <AccuracyHistoryPanel entries={accuracyHistory} />
        </div>

        <section aria-labelledby="t-badges" className="lg:border-l lg:border-ink/30 lg:pl-11">
          <h2 id="t-badges" className={COLUMN_HEAD}>
            Badges
          </h2>
          <p className="mb-3 mt-1 text-caption italic text-ink-soft">
            {unlocked.length} sur {BADGES.length} débloqués
          </p>
          <ul className="border-t border-ink/30">
            {BADGES.map((badge) => {
              const isUnlocked = unlocked.includes(badge.id)
              return (
                <li
                  key={badge.id}
                  className={cn(
                    'flex items-start gap-3.5 border-b border-ink/30 py-3',
                    !isUnlocked && 'text-ink-faint',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="w-7 shrink-0 text-center font-figurine text-[1.5rem] leading-none"
                  >
                    {badge.glyph}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{badge.label}</span>
                    <span className="block text-caption">{badge.description}</span>
                  </span>
                  <span className="sr-only">{isUnlocked ? 'Débloqué' : 'Verrouillé'}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
