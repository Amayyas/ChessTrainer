import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Aurora from '@/components/UI/Aurora'

describe('Aurora', () => {
  it('is decorative: hidden from assistive tech and transparent to the pointer', () => {
    // It sits behind the hero content. A screen reader has nothing to say about
    // it, and a click on it must reach the button underneath.
    const { container } = render(<Aurora />)
    const root = container.firstElementChild

    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).toHaveClass('pointer-events-none')
  })

  it('freezes its drift under prefers-reduced-motion', () => {
    // The blobs animate by default; motion-reduce:animate-none stops them so a
    // reader who asked for stillness gets a static wash, not a moving one.
    const { container } = render(<Aurora />)
    const blobs = container.querySelectorAll('[class*="animate-aurora"]')

    expect(blobs.length).toBeGreaterThan(0)
    for (const blob of blobs) {
      expect(blob).toHaveClass('motion-reduce:animate-none')
    }
  })
})
