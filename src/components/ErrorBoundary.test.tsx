import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '@/components/ErrorBoundary'

function Explodes(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error itself; silencing keeps the run readable
    // without hiding a genuine failure, since the assertions below still stand.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>le plateau</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('le plateau')).toBeInTheDocument()
  })

  it('shows a way out instead of a blank page when a render throws', () => {
    // Without a boundary React unmounts the whole tree, leaving the player on a
    // white page with no indication of what happened and no way back.
    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: /erreur est survenue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recharger/i })).toBeInTheDocument()
  })

  it('reassures the player that their progress survived', () => {
    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/progression est conservée/i)).toBeInTheDocument()
  })
})
