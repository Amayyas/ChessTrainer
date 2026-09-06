import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RouteErrorBoundary from '@/components/RouteErrorBoundary'
import { reportError } from '@/lib/monitoring'

vi.mock('@/lib/monitoring', () => ({ reportError: vi.fn() }))

let shouldThrow = true
function Flaky() {
  if (shouldThrow) throw new Error('boom')
  return <p>page rétablie</p>
}

function renderInRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>)
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(reportError).mockClear()
  })

  it('renders its children when nothing throws', () => {
    shouldThrow = false
    renderInRouter(
      <RouteErrorBoundary>
        <Flaky />
      </RouteErrorBoundary>,
    )
    expect(screen.getByText('page rétablie')).toBeInTheDocument()
  })

  it('shows a scoped message with a retry and a way home, and reports the error', () => {
    renderInRouter(
      <RouteErrorBoundary>
        <Flaky />
      </RouteErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: /n'a pas pu s'ouvrir/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /accueil/i })).toBeInTheDocument()
    expect(reportError).toHaveBeenCalledOnce()
  })

  it('remounts the subtree on "Réessayer", recovering once the cause is gone', async () => {
    renderInRouter(
      <RouteErrorBoundary>
        <Flaky />
      </RouteErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: /n'a pas pu s'ouvrir/i })).toBeInTheDocument()

    shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: /réessayer/i }))

    expect(await screen.findByText('page rétablie')).toBeInTheDocument()
  })
})
