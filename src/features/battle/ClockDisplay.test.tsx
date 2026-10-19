import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ClockDisplay from '@/features/battle/ClockDisplay'

function row(isActive: boolean, ms: number) {
  const { unmount } = render(<ClockDisplay label="Vous (blancs)" ms={ms} isActive={isActive} />)
  const element = screen.getByText('Vous (blancs)').parentElement!
  const classes = element.className.split(/\s+/)
  unmount()
  return classes
}

describe('ClockDisplay', () => {
  it('sets the running clock in reverse, paper on ink', () => {
    expect(row(true, 120_000)).toEqual(expect.arrayContaining(['bg-ink', 'text-paper']))
    expect(row(false, 120_000)).not.toContain('bg-ink')
  })

  it('turns to the rubric under twenty seconds, never as rubric figures on ink', () => {
    // Rubric on ink reads at 2.6:1, so a running clock that is low becomes a
    // rubric block, and an idle one rubric figures on the paper.
    const running = row(true, 15_000)
    expect(running).toEqual(expect.arrayContaining(['bg-rubric', 'text-paper-bright']))
    expect(running).not.toContain('bg-ink')

    const idle = row(false, 15_000)
    expect(idle).toContain('text-rubric')
    expect(idle).not.toContain('bg-ink')
  })
})
