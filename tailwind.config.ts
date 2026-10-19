import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import {
  danger,
  fallbackFontFaces,
  fonts,
  newsprint,
  palette,
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

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // `hover:` only where there is a pointer that hovers. On a touch screen a
  // tapped button kept its hover until the next tap — now the rubric, the
  // colour of a wrong move, left on the undo button.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // `bg-paper`, `text-ink-soft`, `text-rubric`: the newsprint palette.
        ...newsprint,
        ...palette,
        danger,
      },
      // One family under every name. `sans` is what Tailwind's preflight sets on
      // the document, so pointing it at the serif sets the whole interface,
      // inputs and buttons included; `display` is what the headings were written
      // against. Both go once the components ask for `font-serif` themselves.
      fontFamily: {
        serif: [...fonts.serif],
        display: [...fonts.serif],
        sans: [...fonts.serif],
        figurine: [...fonts.figurine],
      },
      fontSize: typeScale,
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [fontFallbacks],
} satisfies Config
