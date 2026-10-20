import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GradeKey from '@/components/UI/GradeKey'
import GradeSign from '@/components/UI/GradeSign'
import { MOVE_QUALITY, MOVE_QUALITY_ORDER } from '@/utils/evaluation'

describe('GradeKey', () => {
  it('sets each sign as the move list does', () => {
    // The key handed its size to GradeSign, and tailwind-merge kept the last
    // font size it was given: the star and the ticks lost the smaller size the
    // sign sets them at, and came out as large as ! and ?.
    render(<GradeKey />)
    const rows = within(
      screen.getByRole('list', { name: 'Barème de notation des coups' }),
    ).getAllByRole('listitem')
    MOVE_QUALITY_ORDER.forEach((quality, index) => {
      const { container } = render(<GradeSign quality={quality} />)
      const alone = within(container as HTMLElement).getByText(MOVE_QUALITY[quality].symbol)
      const inKey = within(rows[index]!).getByText(MOVE_QUALITY[quality].symbol)
      expect(inKey.className, quality).toBe(alone.className)
    })
  })
})
