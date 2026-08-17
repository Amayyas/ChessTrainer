import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card } from '@/components/UI'
import { reportError } from '@/lib/monitoring'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches errors thrown while rendering, which React otherwise answers by
 * unmounting the whole tree — leaving the player on a blank white page with no
 * indication that anything went wrong, and no way back.
 *
 * A class is required: there is no hook equivalent of componentDidCatch.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack says which part of the tree failed, which the error
    // alone does not.
    reportError(Object.assign(error, { componentStack: info.componentStack }))
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-ebene">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-ardoise">
            Quelque chose s'est mal passé de notre côté. Votre progression est conservée.
          </p>
          {/* A full reload rather than a state reset: whatever broke the render
              may well have left the rest of the app in the same bad state. */}
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </Card>
      </div>
    )
  }
}
