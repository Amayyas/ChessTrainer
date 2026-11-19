import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newsprint, nightprint } from '@/lib/design-tokens'
import EditionPicker from '@/features/theme/EditionPicker'
import { applyEdition, useEditionStore } from '@/features/theme/edition'
import { useEdition } from '@/features/theme/useEdition'

/** The two toolbar colours index.html declares, as the page carries them. */
function addThemeMetas() {
  document.head.innerHTML =
    `<meta name="theme-color" content="${newsprint.paper.DEFAULT}">` +
    `<meta name="theme-color" content="${nightprint.paper.DEFAULT}" media="(prefers-color-scheme: dark)">`
}
const metas = () =>
  [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
    (meta) => meta.content,
  )

function Page() {
  useEdition()
  return <EditionPicker />
}

beforeEach(() => {
  addThemeMetas()
  window.localStorage.clear()
  useEditionStore.setState({ edition: 'auto' })
})
afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe('applyEdition', () => {
  it('leaves the system to choose on auto, with each scheme’s toolbar colour', () => {
    document.documentElement.dataset.theme = 'night'
    applyEdition('auto')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(metas()).toEqual([newsprint.paper.DEFAULT, nightprint.paper.DEFAULT])
  })

  it('holds the evening edition, toolbar included, whatever the system asks', () => {
    applyEdition('night')
    expect(document.documentElement.dataset.theme).toBe('night')
    expect(metas()).toEqual([nightprint.paper.DEFAULT, nightprint.paper.DEFAULT])
  })

  it('holds the day edition the same way', () => {
    applyEdition('day')
    expect(document.documentElement.dataset.theme).toBe('day')
    expect(metas()).toEqual([newsprint.paper.DEFAULT, newsprint.paper.DEFAULT])
  })
})

describe('the edition picker', () => {
  it('prints the page in the edition chosen, and remembers it on the device', async () => {
    render(<Page />)
    expect(screen.getByRole('radio', { name: 'Auto' })).toBeChecked()

    await userEvent.click(screen.getByRole('radio', { name: 'Soir' }))
    expect(document.documentElement.dataset.theme).toBe('night')
    expect(JSON.parse(window.localStorage.getItem('chesstrainer.edition')!).state.edition).toBe(
      'night',
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Auto' }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('will not be left with no edition', async () => {
    render(<Page />)
    const evening = screen.getByRole('radio', { name: 'Soir' })
    await userEvent.click(evening)
    await userEvent.click(evening)
    expect(evening).toBeChecked()
  })

  it('falls back to following the system on a stored value it does not know', async () => {
    window.localStorage.setItem(
      'chesstrainer.edition',
      JSON.stringify({ state: { edition: 'sepia' }, version: 1 }),
    )
    await useEditionStore.persist.rehydrate()
    expect(useEditionStore.getState().edition).toBe('auto')
  })
})
