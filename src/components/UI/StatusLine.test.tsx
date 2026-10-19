import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusLine from '@/components/UI/StatusLine'

describe('StatusLine', () => {
  it('announces the state in words, and keeps its spinner quiet', () => {
    render(<StatusLine busy>Chargement de l&apos;IA…</StatusLine>)

    // One live region, named by its words: the spinner inside would otherwise
    // announce "Chargement" on its own, a second time.
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent("Chargement de l'IA…")
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('shows a spinner while busy and a dot once done, in the same box', () => {
    const { container, rerender } = render(<StatusLine busy>Analyse…</StatusLine>)
    const box = container.querySelector('[aria-hidden="true"]')!
    expect(box.querySelector('.animate-\\[spin-slow_0\\.7s_linear_infinite\\]')).not.toBeNull()

    rerender(<StatusLine>IA prête</StatusLine>)
    expect(container.querySelector('[aria-hidden="true"]')).toBe(box)
    expect(box.querySelector('.rounded-full.bg-ink')).not.toBeNull()
  })
})
