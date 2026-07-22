import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
import AuthLayout from '@/features/auth/AuthLayout'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

export default function LoginPage() {
  const signIn = useAuthStore((state) => state.signIn)
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Send the player back where the guard intercepted them.
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.leaderboard

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    const ok = await signIn({ email, password })
    setIsSubmitting(false)
    if (ok) navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Retrouvez votre progression et le classement mondial."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link to={ROUTES.register} className="font-semibold text-ebene underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-ebene/20 px-3 py-2"
          />
        </label>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  )
}
