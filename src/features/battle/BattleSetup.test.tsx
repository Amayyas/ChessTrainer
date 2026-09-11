import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ENGINE_LEVELS } from '@/engine/levels'
import BattleSetup from '@/features/battle/BattleSetup'
import { TIME_CONTROLS } from '@/hooks/useChessClock'

/**
 * Nothing covered this card before. Its three settings were divs of buttons
 * carrying aria-pressed: unnamed as groups, thirteen tab stops between them,
 * and deaf to the arrow keys.
 */
const level = () => screen.getByRole('radiogroup', { name: "Niveau de l'IA" })
const colour = () => screen.getByRole('radiogroup', { name: 'Votre couleur' })

describe('BattleSetup', () => {
  it('names each group by the heading above it', () => {
    render(<BattleSetup onStart={vi.fn()} />)

    // aria-labelledby, not proximity. A screen reader used to meet three
    // collections with no name at all, and which setting it was in was prose
    // sitting beside them.
    expect(level()).toBeInTheDocument()
    expect(colour()).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Cadence' })).toBeInTheDocument()
  })

  it('starts the game with the settings that were chosen', async () => {
    const onStart = vi.fn()
    render(<BattleSetup onStart={onStart} />)

    const lastLevel = ENGINE_LEVELS[ENGINE_LEVELS.length - 1]
    const lastControl = TIME_CONTROLS[TIME_CONTROLS.length - 1]
    if (!lastLevel || !lastControl) throw new Error('expected levels and time controls')

    await userEvent.click(within(level()).getByRole('radio', { name: new RegExp(lastLevel.label) }))
    await userEvent.click(within(colour()).getByRole('radio', { name: /Noirs/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Commencer la partie' }))

    // levelId is a number and a toggle group's values are strings, so the id
    // makes a round trip through String() and back. If that conversion were
    // dropped the engine would be handed "6" and the level lookup would miss.
    expect(onStart).toHaveBeenCalledWith({
      levelId: lastLevel.id,
      colorChoice: 'black',
      timeControlId: 'unlimited',
    })
    expect(typeof onStart.mock.calls[0]?.[0].levelId).toBe('number')
  })

  it('will not let a setting be emptied', async () => {
    const onStart = vi.fn()
    render(<BattleSetup onStart={onStart} />)

    // Radix deselects on a second press of the option already on. A colour has
    // no empty state: the game would start as neither white nor black.
    const white = within(colour()).getByRole('radio', { name: /Blancs/ })
    expect(white).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(white)
    expect(white).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Commencer la partie' }))
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ colorChoice: 'white' }))
  })

  it('walks a group with the arrow keys instead of the tab key', async () => {
    render(<BattleSetup onStart={vi.fn()} />)

    const options = within(colour()).getAllByRole('radio')
    const [white, black] = options
    if (!white || !black) throw new Error('expected at least two colours')

    white.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(black).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(black).toHaveAttribute('aria-checked', 'true')
  })

  it('cannot be started while the engine is still loading', () => {
    render(<BattleSetup onStart={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: /Chargement/ })).toBeDisabled()
  })
})
