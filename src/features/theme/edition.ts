import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { newsprint, nightprint } from '@/lib/design-tokens'

/**
 * Which edition the page is printed in: the one the system asks for, or the
 * day or evening edition whatever it asks.
 */
export type EditionChoice = 'auto' | 'day' | 'night'

export const EDITION_CHOICES: readonly EditionChoice[] = ['auto', 'day', 'night']

interface EditionPreference {
  edition: EditionChoice
  setEdition: (edition: EditionChoice) => void
}

/**
 * The edition chosen on this device. Kept on the device, as the board's
 * squares are, rather than with the account: a screen setting, which a phone
 * read in bed and a desk monitor may want different.
 */
export const useEditionStore = create<EditionPreference>()(
  persist(
    (set) => ({
      edition: 'auto',
      setEdition: (edition) => set({ edition }),
    }),
    {
      name: 'chesstrainer.edition',
      version: 1,
      // Anything but a choice this version knows falls back to following the
      // system, never to an edition nobody picked.
      merge: (persisted, current) => {
        const stored = (persisted as Partial<EditionPreference> | undefined)?.edition
        return {
          ...current,
          edition: EDITION_CHOICES.includes(stored as EditionChoice)
            ? (stored as EditionChoice)
            : 'auto',
        }
      },
    },
  ),
)

/**
 * Prints the page in `edition`: `data-theme` on <html>, which the palette's
 * custom properties follow (tailwind.config.ts), and the browser toolbar's
 * colour, which index.html sets per system scheme and a forced edition must
 * override in both.
 */
export function applyEdition(edition: EditionChoice, doc: Document = document): void {
  const root = doc.documentElement
  if (edition === 'auto') delete root.dataset.theme
  else root.dataset.theme = edition

  const [day, night] = [newsprint.paper.DEFAULT, nightprint.paper.DEFAULT]
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    // The attribute rather than the property: not every DOM implements `media`
    // on <meta>, and a missing one must read as the day colour, not throw.
    const forNight = (meta.getAttribute('media') ?? '').includes('dark')
    meta.content = edition === 'auto' ? (forNight ? night : day) : edition === 'night' ? night : day
  }
}
