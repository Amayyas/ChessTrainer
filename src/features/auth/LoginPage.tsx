import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/UI'
import Input from '@/components/UI/Input'
import { INLINE_LINK, INLINE_LINK_PLAIN } from '@/components/UI/link'
import AuthLayout from '@/features/auth/AuthLayout'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/utils/cn'

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
          <Link to={ROUTES.register} className={INLINE_LINK}>
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Se connecter
        </Button>
        <Link
          to={ROUTES.forgotPassword}
          className={cn(INLINE_LINK_PLAIN, 'text-center text-caption')}
        >
          Mot de passe oublié ?
        </Link>
      </form>
    </AuthLayout>
  )
}
