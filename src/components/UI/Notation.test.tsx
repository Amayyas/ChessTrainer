import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Notation from '@/components/UI/Notation'
import { FIGURINES, FRENCH_LETTERS } from '@/utils/notation'

describe('Notation', () => {
  it('draws the piece for the eye and names it in French for a screen reader', () => {
    const { container } = render(<Notation san="Nxe5+" />)

    const figurine = container.querySelector('[aria-hidden="true"]')
    expect(figurine).toHaveTextContent(FIGURINES.N)
    expect(figurine).toHaveClass('font-figurine')
    expect(container.querySelector('.sr-only')).toHaveTextContent(FRENCH_LETTERS.N)
    // The English letter never reaches the page.
    expect(container).not.toHaveTextContent('N')
    expect(container).toHaveTextContent(`${FIGURINES.N}${FRENCH_LETTERS.N}xe5+`)
  })

  it('writes a pawn move without any figurine', () => {
    const { container } = render(<Notation san="exd5" />)

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(container).toHaveTextContent('exd5')
  })

  it('keeps a move on one line', () => {
    const { container } = render(<Notation san="Qxh7#" />)

    expect(container.firstElementChild).toHaveClass('whitespace-nowrap')
  })
})
