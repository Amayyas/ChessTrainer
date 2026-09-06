import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/UI'
import { reportError } from '@/lib/monitoring'
import { ROUTES } from '@/routes'

interface Props {
  children: ReactNode
}

interface State {
  /** Bumped by "Réessayer" to remount the subtree — and re-run a lazy import. */
  attempt: number
  failed: boolean
}

/**
 * Catches a failure inside one route without taking the app down with it.
 *
 * The root ErrorBoundary answers a render error by offering a full reload,
 * which is right when the whole tree may be in a bad state. A chunk that
 * failed to load, or one page that threw, is narrower than that: this sits
 * inside the layout, so the sidebar and navigation stay, and "Réessayer"
 * remounts just the page — which re-runs the dynamic import behind a lazy
 * route rather than reloading everything.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { attempt: 0, failed: false }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(Object.assign(error, { componentStack: info.componentStack }))
  }

  private retry = () => {
    this.setState((state) => ({ attempt: state.attempt + 1, failed: false }))
  }

  render() {
    if (!this.state.failed) {
      // Keyed on the attempt count: changing it throws the failed subtree away
      // and builds a fresh one, so a lazy route starts its import over.
      return <div key={this.state.attempt}>{this.props.children}</div>
    }

    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-ebene">
          Cette page n'a pas pu s'ouvrir
        </h1>
        <p className="mt-2 text-sm text-ardoise">
          Le chargement a échoué, souvent une simple coupure réseau. Votre progression est
          conservée.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={this.retry}>Réessayer</Button>
          <Link
            to={ROUTES.home}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-ebene underline underline-offset-2"
          >
            Retour à l'accueil
          </Link>
        </div>
      </Card>
    )
  }
}
