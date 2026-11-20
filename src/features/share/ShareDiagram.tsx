import { useState } from 'react'
import { Button } from '@/components/UI'
import type { DiagramRequest } from '@/features/share/renderDiagram'
import { brand } from '@/lib/design-tokens'

type State = 'idle' | 'working' | 'shared' | 'downloaded' | 'failed'

const SAID: Record<Exclude<State, 'idle' | 'working'>, string> = {
  shared: 'Diagramme partagé.',
  downloaded: 'Image du diagramme enregistrée.',
  failed: 'L’image n’a pas pu être créée.',
}

/**
 * Turns the position on the board into a printed diagram, an image to post or
 * send. The drawing code is fetched on the first press, so a page that never
 * shares never loads it.
 */
export default function ShareDiagram({ request }: { request: DiagramRequest }) {
  const [state, setState] = useState<State>('idle')

  const share = async () => {
    setState('working')
    try {
      const [{ renderDiagram }, { shareImage }] = await Promise.all([
        import('@/features/share/renderDiagram'),
        import('@/features/share/shareImage'),
      ])
      const image = await renderDiagram(request)
      const outcome = await shareImage(
        image,
        'diagramme-chesstrainer.png',
        `Un diagramme de ${brand.name} — ${brand.domain}`,
      )
      setState(outcome === 'cancelled' ? 'idle' : outcome)
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="quiet" size="sm" disabled={state === 'working'} onClick={share}>
        {state === 'working' ? 'Création de l’image…' : 'Partager le diagramme'}
      </Button>
      <p role="status" className="text-caption italic text-ink-soft">
        {state === 'idle' || state === 'working' ? '' : SAID[state]}
      </p>
    </div>
  )
}
