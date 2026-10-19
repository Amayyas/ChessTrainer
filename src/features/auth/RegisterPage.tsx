import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
import Input from '@/components/UI/Input'
import { INLINE_LINK } from '@/components/UI/link'
import AuthLayout from '@/features/auth/AuthLayout'
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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    const outcome = await signUp({ email, password, username })
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
          <label className="block">
            <span className="mb-1.5 block text-caption font-semibold">Pseudo</span>
            <Input
              type="text"
              required
              minLength={3}
              maxLength={24}
              autoComplete="nickname"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
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
