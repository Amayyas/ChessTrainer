import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/UI'
import AuthLayout from '@/features/auth/AuthLayout'
import { ROUTES } from '@/routes'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Asks for an address and sends a recovery link to it.
 *
 * The confirmation is deliberately the same whether or not that address has an
 * account. Saying "no account with this email" would make the form a way for
 * anyone to test which addresses are registered, and the accounts here carry a
 * real name and a ranking.
 */
export default function ForgotPasswordPage() {
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    const ok = await requestPasswordReset(email)
    setIsSubmitting(false)
    if (ok) setIsSent(true)
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un lien pour en choisir un nouveau."
      showGoogle={false}
      footer={
        <Link to={ROUTES.login} className="font-semibold text-ebene underline">
          Retour à la connexion
        </Link>
      }
    >
      {isSent ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Si un compte existe avec cette adresse, un lien vient d'être envoyé. Pensez à regarder vos
          spams, et gardez cette page ouverte&nbsp;: le lien s'ouvre dans le même navigateur.
        </p>
      ) : (
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
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Envoyer le lien
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
