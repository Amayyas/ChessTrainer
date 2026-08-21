import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
import AuthLayout from '@/features/auth/AuthLayout'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

/** Supabase's minimum, mirrored here so the check happens before the round trip. */
const MIN_LENGTH = 6

/**
 * Where the recovery link lands.
 *
 * The link carries a token that the Supabase client exchanges for a session on
 * load, which raises a recovery flag in the store. That flag is what admits
 * someone here, not the mere presence of a session: everyone already signed in
 * has one of those, and gating on it would hand every visitor a hidden
 * change-password page — including Google accounts with no password to change.
 */
export default function ResetPasswordPage() {
  const updatePassword = useAuthStore((state) => state.updatePassword)
  const isReady = useAuthStore((state) => state.isReady)
  const isRecovering = useAuthStore((state) => state.isRecovering)
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < MIN_LENGTH) {
      setLocalError(`Le mot de passe doit faire au moins ${MIN_LENGTH} caractères.`)
      return
    }
    if (password !== confirmation) {
      setLocalError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLocalError(null)
    setIsSubmitting(true)
    const ok = await updatePassword(password)
    setIsSubmitting(false)
    if (ok) navigate(ROUTES.profile, { replace: true })
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe, vous serez connecté aussitôt."
      showGoogle={false}
      footer={
        <Link to={ROUTES.login} className="font-semibold text-ebene underline">
          Retour à la connexion
        </Link>
      }
    >
      {isReady && !isRecovering ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ce lien n'est plus valide. Les liens de récupération expirent au bout d'une heure et ne
          servent qu'une fois&nbsp;:{' '}
          <Link to={ROUTES.forgotPassword} className="font-semibold underline">
            demandez-en un nouveau
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {localError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {localError}
            </p>
          )}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ardoise">Nouveau mot de passe</span>
            <input
              type="password"
              required
              minLength={MIN_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-ebene/20 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ardoise">Confirmation</span>
            <input
              type="password"
              required
              minLength={MIN_LENGTH}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-lg border border-ebene/20 px-3 py-2"
            />
          </label>
          <Button type="submit" fullWidth isLoading={isSubmitting} disabled={!isReady}>
            Enregistrer
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
