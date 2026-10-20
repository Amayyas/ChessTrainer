import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GradeSign from '@/components/UI/GradeSign'
import { MOVE_QUALITY } from '@/utils/evaluation'

describe('GradeSign', () => {
  it('keeps the star a size smaller whatever size the caller sets', () => {
    // A size handed to the sign used to replace its own, through
    // tailwind-merge, and the key's star came out as large as its marks.
    render(<GradeSign quality="best" className="text-[1.2em]" />)
    const star = screen.getByText(MOVE_QUALITY.best.symbol)
    expect(star).toHaveClass('text-[0.8em]')
    expect(star.parentElement).toHaveClass('text-[1.2em]')
  })

  it('sets the marks in the text’s bold, at the caller’s size', () => {
    render(<GradeSign quality="mistake" className="text-[1.2em]" />)
    const mark = screen.getByText(MOVE_QUALITY.mistake.symbol)
    expect(mark).toHaveClass('font-bold')
    expect(mark).not.toHaveClass('text-[0.8em]')
  })
})
