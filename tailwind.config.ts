import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import tailwindcssAnimate from 'tailwindcss-animate'
import {
  danger,
  fallbackFontFaces,
  fonts,
  inverseTheme,
  newsprint,
  palette,
  radius,
  semanticTheme,
  typeScale,
} from './src/lib/design-tokens'

/**
 * The theme is read from src/lib/design-tokens.ts rather than written here, so
 * the classes and the few components that need a raw CSS colour cannot drift
 * apart. Change the palette there and both follow.
 *
 * Two naming systems are live at once, on purpose. `bg-or` and `text-ebene` are
 * what the hand-written components use; `bg-primary` and `text-muted-foreground`
 * are what a component pulled from ui.shadcn.com uses. Both resolve to the same
 * palette, which is what lets the migration proceed one component at a time
 * instead of in a single sweep.
 */

/**
 * Writes the shadcn variables onto `:root`, straight from the tokens, and the
 * ebony set onto `.theme-inverse`. A component inside one of those sections
 * needs no variant and no `dark:` prefix: it reads the same class names and the
 * cascade hands it the other palette.
 */
const semanticVariables = plugin(({ addBase, addComponents }) => {
  addBase({ ':root': { ...semanticTheme, '--radius': radius } })
  addComponents({ '.theme-inverse': { ...inverseTheme } })
})

/**
 * The local serifs reshaped to Newsreader's metrics, written as @font-face
 * rules from the faces in design-tokens.ts, which also name them in the font
 * stack — so a face and the name that asks for it cannot drift apart.
 */
const fontFallbacks = plugin(({ addBase }) => {
  addBase(fallbackFontFaces())
})

/** `hsl(var(--x) / <alpha-value>)`, so `bg-primary/50` still works. */
const withAlpha = (name: string) => `hsl(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // `bg-paper`, `text-ink-soft`, `text-rubric`: the newsprint palette.
        ...newsprint,
        ...palette,
        danger,
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },
        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--destructive-foreground'),
        },
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),
      },
      // One family under every name. `sans` is what Tailwind's preflight sets on
      // the document, so pointing it at the serif sets the whole interface,
      // inputs and buttons included; `display` is what the headings were written
      // against. Both go once the components ask for `font-serif` themselves.
      fontFamily: { serif: [...fonts.serif], display: [...fonts.serif], sans: [...fonts.serif] },
      fontSize: typeScale,
      boxShadow: {
        card: '0 1px 2px rgba(26, 26, 46, 0.04), 0 8px 24px -12px rgba(26, 26, 46, 0.18)',
        'card-hover': '0 2px 4px rgba(26, 26, 46, 0.06), 0 16px 40px -16px rgba(26, 26, 46, 0.28)',
        gold: '0 8px 24px -10px rgba(201, 168, 76, 0.6)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        // shadcn components ask for these three and derive them from --radius.
        // See the note on `radius` in design-tokens.ts: lg and md come out
        // equal to Tailwind's own, so the 37 corners already written do not
        // move. sm does not — it goes from 2px to 4px — and that is only
        // harmless because nothing in src/ uses rounded-sm. Anything that
        // starts to will get the larger corner.
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [semanticVariables, fontFallbacks, tailwindcssAnimate],
} satisfies Config
