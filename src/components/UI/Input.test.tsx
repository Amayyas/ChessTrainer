import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import Input from '@/components/UI/Input'

describe('Input', () => {
  it('is a native field, with its attributes and its ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <label>
        Email
        <Input ref={ref} type="email" autoComplete="email" required />
      </label>,
    )

    const field = screen.getByRole('textbox', { name: 'Email' })
    expect(field).toHaveAttribute('type', 'email')
    expect(field).toHaveAttribute('autocomplete', 'email')
    expect(field).toBeRequired()
    expect(ref.current).toBe(field)
  })

  it('is drawn square and flat, like every frame on the page', () => {
    render(<Input aria-label="Pseudo" />)

    expect(screen.getByRole('textbox').className).not.toMatch(/\brounded-|\bshadow-/)
  })
})
