import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HintList from '@/components/HintList'
import { FIGURINES, FRENCH_LETTERS } from '@/utils/notation'

describe('HintList', () => {
  it('numbers the hints in order', () => {
    render(<HintList hints={['Cherchez un coup de votre cavalier.', 'La pièce est en g1.']} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('1.Cherchez un coup de votre cavalier.')
    expect(items[1]).toHaveTextContent('2.La pièce est en g1.')
  })

  it('sets the move a hint gives away in figurines', () => {
    render(<HintList hints={[{ lead: 'Le meilleur coup est', san: 'Nf3' }]} />)

    const [item] = screen.getAllByRole('listitem')
    expect(item).toHaveTextContent(`Le meilleur coup est ${FIGURINES.N}${FRENCH_LETTERS.N}f3.`)
    expect(item).not.toHaveTextContent('Nf3')
  })
})
