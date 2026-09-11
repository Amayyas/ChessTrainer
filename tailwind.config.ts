import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import tailwindcssAnimate from 'tailwindcss-animate'
import {
  danger,
  fonts,
  inverseTheme,
  palette,
  radius,
  semanticTheme,
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

/** `hsl(var(--x) / <alpha-value>)`, so `bg-primary/50` still works. */
const withAlpha = (name: string) => `hsl(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      fontFamily: { display: [...fonts.display], sans: [...fonts.sans] },
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
        // The hero aurora: two blobs drift on offset paths so the wash never
        // looks like it is on a single track.
        'aurora-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(12%, 8%, 0) scale(1.15)' },
        },
        'aurora-slower': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.1)' },
          '50%': { transform: 'translate3d(-10%, -6%, 0) scale(1)' },
        },
      },
      animation: {
        'aurora-slow': 'aurora-slow 24s ease-in-out infinite',
        'aurora-slower': 'aurora-slower 32s ease-in-out infinite',
      },
    },
  },
  plugins: [semanticVariables, tailwindcssAnimate],
} satisfies Config
