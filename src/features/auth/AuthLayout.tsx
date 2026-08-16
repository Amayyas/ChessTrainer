import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/UI'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Shell shared by the sign-in and sign-up screens. */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const error = useAuthStore((state) => state.error)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)

  if (!isSupabaseConfigured) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <span aria-hidden="true" className="text-4xl text-or">
          ♜
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold text-ebene">Comptes indisponibles</h1>
        <p className="mt-2 text-sm text-ardoise">
          Aucun serveur n'est configuré sur cette installation. Tous les modes restent jouables en
          invité ; seul le classement mondial demande un compte.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-ebene px-5 text-sm font-semibold text-ivoire"
        >
          Retour à l'accueil
        </Link>
      </Card>
    )
  }

  return (
    <Card className="mx-auto flex max-w-md flex-col gap-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ebene">{title}</h1>
        <p className="mt-1 text-sm text-ardoise">{subtitle}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {children}

      <div className="flex items-center gap-3 text-xs text-ardoise">
        <span className="h-px flex-1 bg-ebene/10" />
        ou
        <span className="h-px flex-1 bg-ebene/10" />
      </div>

      <Button variant="outline" fullWidth onClick={() => void signInWithGoogle()}>
        Continuer avec Google
      </Button>

      <p className="text-center text-sm text-ardoise">{footer}</p>
    </Card>
  )
}
