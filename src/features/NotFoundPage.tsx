import { Link } from 'react-router-dom'
import { Box, Button } from '@/components/UI'
import { ROUTES } from '@/routes'

export default function NotFoundPage() {
  return (
    <Box className="mx-auto max-w-xl text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-ebene text-4xl text-or"
      >
        ♘
      </span>
      <h1 className="font-display text-3xl font-bold text-ebene">Page introuvable</h1>
      <p className="mt-3 text-ardoise">Ce coup n'est pas légal. Retour à la case départ.</p>
      <Button asChild className="mt-6">
        <Link to={ROUTES.home}>Retour à l'accueil</Link>
      </Button>
    </Box>
  )
}
