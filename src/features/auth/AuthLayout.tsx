import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Box, Button } from '@/components/UI'
import Alert from '@/components/UI/Alert'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
  /** The recovery screens have nothing to offer a Google account. */
  showGoogle?: boolean
}

/** Shell shared by the sign-in and sign-up screens. */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  showGoogle = true,
}: AuthLayoutProps) {
  const error = useAuthStore((state) => state.error)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)

  if (!isSupabaseConfigured) {
    return (
      <Box className="mx-auto max-w-md text-center">
        <span aria-hidden="true" className="font-figurine text-[2.5rem] leading-none">
          ♜
        </span>
        <h1 className="mt-3 text-title font-semibold">Comptes indisponibles</h1>
        <p className="mt-2 text-caption italic text-ink-soft">
          Aucun serveur n'est configuré sur cette installation. Tous les modes restent jouables en
          invité ; seul le classement mondial demande un compte.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </Box>
    )
  }

  return (
    <Box className="mx-auto flex max-w-md flex-col gap-5">
      <div className="text-center">
        <h1 className="text-title font-semibold">{title}</h1>
        <p className="mt-1 text-caption italic text-ink-soft">{subtitle}</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {children}

      {showGoogle && (
        <>
          <div className="flex items-center gap-3 text-caption italic text-ink-soft">
            <span className="h-px flex-1 bg-ink/30" />
            ou
            <span className="h-px flex-1 bg-ink/30" />
          </div>

          <Button variant="secondary" fullWidth onClick={() => void signInWithGoogle()}>
            Continuer avec Google
          </Button>
        </>
      )}

      <p className="text-center text-caption">{footer}</p>
    </Box>
  )
}
