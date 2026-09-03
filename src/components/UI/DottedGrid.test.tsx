import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DottedGrid from '@/components/UI/DottedGrid'

describe('DottedGrid', () => {
  it('is decorative: hidden from assistive tech and transparent to the pointer', () => {
    // It sits behind the hero content. A screen reader has nothing to say about
    // it, and a click on it must reach the button underneath.
    const { container } = render(<DottedGrid />)
    const root = container.firstElementChild

    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).toHaveClass('pointer-events-none')
  })

  it('takes an extra className', () => {
    const { container } = render(<DottedGrid className="rounded-2xl" />)
    expect(container.firstElementChild).toHaveClass('rounded-2xl')
  })
})
