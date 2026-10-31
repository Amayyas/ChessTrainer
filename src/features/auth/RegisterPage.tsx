import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
import Input from '@/components/UI/Input'
import { INLINE_LINK } from '@/components/UI/link'
import AuthLayout from '@/features/auth/AuthLayout'
import { useUsernameCheck } from '@/features/auth/useUsernameCheck'
import { USERNAME_FORMAT, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/lib/username'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

export default function RegisterPage() {
  const signUp = useAuthStore((state) => state.signUp)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const usernameCheck = useUsernameCheck()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    // Checked before the account is created: afterwards, the database would
    // settle a taken name by quietly appending characters to it.
    const name = await usernameCheck.validate(username)
    if (!name) {
      setIsSubmitting(false)
      return
    }
    const outcome = await signUp({ email, password, username: name })
    setIsSubmitting(false)
    // Only a sign-up that came back with a session has anything to show on the
    // profile. Navigating there without one is how a new player landed on the
    // guest screen seconds after registering.
    if (outcome === 'signed-in') navigate(ROUTES.profile, { replace: true })
    if (outcome === 'awaiting-confirmation') setAwaitingConfirmation(true)
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Pour figurer au classement mondial et retrouver vos progrès partout."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to={ROUTES.login} className={INLINE_LINK}>
            Se connecter
          </Link>
        </>
      }
    >
      {awaitingConfirmation ? (
        <div role="status" className="border-y border-ink py-3 text-caption">
          <p className="font-semibold">Votre compte est créé. Une dernière étape&nbsp;:</p>
          <p className="mt-1">
            Nous venons d'envoyer un message à <strong>{email}</strong>. Ouvrez-le et suivez le lien
            pour confirmer votre adresse — vous serez alors connecté et amené à votre profil.
          </p>
          <p className="mt-2 italic text-ink-soft">
            Rien reçu&nbsp;? Regardez vos spams, le message part de{' '}
            <code>noreply@mail.app.supabase.io</code>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label className="block">
              <span className="mb-1.5 block text-caption font-semibold">Pseudo</span>
              <Input
                type="text"
                required
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                autoComplete="nickname"
                value={username}
                aria-invalid={usernameCheck.problem !== null}
                aria-describedby="username-note"
                onChange={(event) => {
                  setUsername(event.target.value)
                  usernameCheck.clear()
                }}
                onBlur={() => {
                  if (username.trim()) void usernameCheck.validate(username)
                }}
              />
            </label>
            {usernameCheck.problem ? (
              <span
                id="username-note"
                role="alert"
                className="mt-1.5 block text-caption font-semibold text-rubric"
              >
                {usernameCheck.problem}
              </span>
            ) : (
              <span id="username-note" className="mt-1.5 block text-caption italic text-ink-soft">
                {USERNAME_FORMAT} Modifiable ensuite depuis votre profil.
              </span>
            )}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-caption font-semibold">Email</span>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-caption font-semibold">Mot de passe</span>
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="mt-1.5 block text-caption italic text-ink-soft">
              Six caractères au minimum.
            </span>
          </label>
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Créer mon compte
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
