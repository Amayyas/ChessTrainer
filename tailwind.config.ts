import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import {
  diagram,
  editionVariables,
  fallbackFontFaces,
  fonts,
  newsprint,
  nightprint,
  themeColors,
  typeScale,
} from './src/lib/design-tokens'

/**
 * The theme is read from src/lib/design-tokens.ts rather than written here, so
 * the classes and the few components that need a raw CSS colour cannot drift
 * apart. Change the palette there and both follow.
 */

/**
 * The local serifs reshaped to Newsreader's metrics, written as @font-face
 * rules from the faces in design-tokens.ts, which also name them in the font
 * stack — so a face and the name that asks for it cannot drift apart.
 */
const fontFallbacks = plugin(({ addBase }) => {
  addBase(fallbackFontFaces())
})

/**
 * The two editions as custom properties. The day edition is the default; the
 * evening one follows the system's dark setting unless the player chose the
 * day edition, and applies whenever they chose it — `data-theme` on <html>,
 * set by src/features/theme. `color-scheme` tells the browser too, for its
 * scrollbars and form controls.
 */
const editions = plugin(({ addBase }) => {
  const day = { ...editionVariables(newsprint, diagram.day), colorScheme: 'light' }
  const night = { ...editionVariables(nightprint, diagram.night), colorScheme: 'dark' }
  addBase({
    ':root': day,
    '@media (prefers-color-scheme: dark)': { ':root:not([data-theme="day"])': night },
    ':root[data-theme="night"]': night,
  })
})

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // `hover:` only where there is a pointer that hovers. On a touch screen a
  // tapped button kept its hover until the next tap — now the rubric, the
  // colour of a wrong move, left on the undo button.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    // The type scale replaces Tailwind's sizes rather than joining them: with
    // `text-sm` and `text-base` on offer, the tabs and the toggles took them and
    // set text off the scale without anything failing. Now such a class sets
    // nothing, and the text keeps the body size it inherits.
    fontSize: typeScale,
    extend: {
      colors: {
        // `bg-paper`, `text-ink-soft`, `text-rubric`: the newsprint palette,
        // read from custom properties so the evening edition can swap it.
        ...themeColors,
      },
      // One family for all text. `sans` is what Tailwind's preflight sets on the
      // document and on form controls, so it points at the serif too: inputs and
      // buttons are set in Newsreader without a class of their own.
      fontFamily: {
        serif: [...fonts.serif],
        sans: [...fonts.serif],
        figurine: [...fonts.figurine],
      },
      keyframes: {
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [fontFallbacks, editions],
} satisfies Config
