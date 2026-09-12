import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/Tabs'

/**
 * The puzzle page is the caller, and it cannot be rendered here: its board
 * needs a Worker and a measured width. So the behaviour it leans on is pinned
 * on the component instead — above all forceMount, which is the whole reason
 * the page can switch tabs without throwing away a run in progress.
 */
function Harness() {
  const [tab, setTab] = useState('daily')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Mode de jeu">
        <TabsTrigger value="daily">Série du jour</TabsTrigger>
        <TabsTrigger value="practice">Entraînement libre</TabsTrigger>
      </TabsList>
      <TabsContent value="daily" forceMount hidden={tab !== 'daily'}>
        <p>Série</p>
      </TabsContent>
      <TabsContent value="practice" forceMount hidden={tab !== 'practice'}>
        <p>Entraînement</p>
      </TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('exposes a named tablist with the panel each tab controls', () => {
    render(<Harness />)

    const list = screen.getByRole('tablist', { name: 'Mode de jeu' })
    const [daily, practice] = screen.getAllByRole('tab')
    if (!daily || !practice) throw new Error('expected two tabs')

    expect(list).toContainElement(daily)
    expect(daily).toHaveAttribute('aria-selected', 'true')
    expect(practice).toHaveAttribute('aria-selected', 'false')

    // aria-controls is what lets a screen reader jump from the tab to its
    // panel. The two pressed buttons this replaced controlled nothing, and the
    // panels were anonymous divs, one of them hidden.
    const panelId = daily.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    const panel = document.getElementById(panelId as string)
    expect(panel).not.toBeNull()
    expect(panel).toHaveAccessibleName('Série du jour')
  })

  it('moves between tabs with the arrow keys', async () => {
    render(<Harness />)
    const [daily, practice] = screen.getAllByRole('tab')
    if (!daily || !practice) throw new Error('expected two tabs')

    await userEvent.tab()
    expect(daily).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(practice).toHaveFocus()
    expect(practice).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the hidden panel mounted when forceMount is set', async () => {
    render(<Harness />)

    // The assumption the puzzle page rests on. Without forceMount Radix
    // unmounts the panel that is not showing, and switching tabs would discard
    // a daily series or a practice run half finished. It stays in the document
    // and carries the hidden attribute instead. forceMount alone does not do
    // that: Radix computes hidden from the same flag, so the panel would stay
    // mounted AND visible, and both views would be on screen at once.
    const panelFor = (name: string) => {
      const id = screen.getByRole('tab', { name }).getAttribute('aria-controls')
      const panel = document.getElementById(id as string)
      if (!panel) throw new Error(`no panel for ${name}`)
      return panel
    }

    expect(screen.getByText('Entraînement')).toBeInTheDocument()
    expect(panelFor('Entraînement libre')).toHaveAttribute('hidden')
    expect(panelFor('Série du jour')).not.toHaveAttribute('hidden')

    await userEvent.click(screen.getByRole('tab', { name: 'Entraînement libre' }))

    expect(screen.getByText('Série')).toBeInTheDocument()
    expect(panelFor('Série du jour')).toHaveAttribute('hidden')
    expect(panelFor('Entraînement libre')).not.toHaveAttribute('hidden')
  })
})
