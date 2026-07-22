import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    const ok = await signUp({ email, password, username })
    setIsSubmitting(false)
    if (ok) navigate(ROUTES.profile, { replace: true })
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Pour figurer au classement mondial et retrouver vos progrès partout."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link to={ROUTES.login} className="font-semibold text-ebene underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ardoise">Pseudo</span>
          <input
            type="text"
            required
            minLength={3}
            maxLength={24}
            autoComplete="nickname"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-ebene/20 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ardoise">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-ebene/20 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ardoise">Mot de passe</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-ebene/20 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-ardoise">Six caractères au minimum.</span>
        </label>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Créer mon compte
        </Button>
      </form>
    </AuthLayout>
  )
}
