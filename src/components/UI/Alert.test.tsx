import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Alert from '@/components/UI/Alert'
import { INLINE_LINK } from '@/components/UI/link'

describe('Alert', () => {
  it('is read out as an alert, as a solid rubric block', () => {
    render(<Alert>Le lien a expiré.</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Le lien a expiré.')
    expect(alert).toHaveClass('bg-rubric', 'text-paper-bright')
  })

  it('keeps a link inside readable under the pointer', () => {
    // An inline link turns to the rubric under the pointer, which inside the
    // block is its ground: the expired-link screen's only way forward vanished
    // when pointed at. The block overrides the hover for any link it holds.
    render(
      <Alert>
        Ce lien n’est plus valide :{' '}
        <a href="/mot-de-passe-oublie" className={INLINE_LINK}>
          demandez-en un nouveau
        </a>
      </Alert>,
    )
    expect(screen.getByRole('alert')).toHaveClass('[&_a:hover]:text-paper-bright')
  })
})
