import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '@/components/ErrorBoundary'
import { lazyWithRetry } from '@/components/lazyWithRetry'

/**
 * A route chunk that 404s once — the shape of a deploy landing mid-session —
 * must not throw on the first failure. And one that fails for good must still
 * reach a boundary rather than hang on the fallback.
 */

describe('lazyWithRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('recovers when the import fails once then succeeds', async () => {
    let calls = 0
    const factory = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw new Error('Failed to fetch dynamically imported module')
      return { default: () => <p>la page</p> }
    })
    const Page = lazyWithRetry(factory, { retries: 2, delayMs: 1 })

    render(
      <Suspense fallback={<p>chargement</p>}>
        <Page />
      </Suspense>,
    )

    expect(await screen.findByText('la page')).toBeInTheDocument()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('gives up after the retries and lets a boundary catch it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const factory = vi.fn(async () => {
      throw new Error('Failed to fetch dynamically imported module')
    })
    const Page = lazyWithRetry(factory, { retries: 2, delayMs: 1 })

    render(
      <ErrorBoundary>
        <Suspense fallback={<p>chargement</p>}>
          <Page />
        </Suspense>
      </ErrorBoundary>,
    )

    expect(await screen.findByRole('heading', { name: /erreur est survenue/i })).toBeInTheDocument()
    // The initial attempt plus two retries.
    expect(factory).toHaveBeenCalledTimes(3)
  })
})
