import { Link } from 'react-router-dom'
import { Box, Button } from '@/components/UI'
import { ROUTES } from '@/routes'

export default function NotFoundPage() {
  return (
    <Box className="mx-auto max-w-xl text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 block font-figurine text-[4rem] leading-none"
      >
        ♘
      </span>
      <h1 className="text-title font-semibold">Page introuvable</h1>
      <p className="mt-3 italic text-ink-soft">Ce coup n'est pas légal. Retour à la case départ.</p>
      <Button asChild className="mt-6">
        <Link to={ROUTES.home}>Retour à l'accueil</Link>
      </Button>
    </Box>
  )
}
