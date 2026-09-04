import type { Config } from 'tailwindcss'
import { danger, fonts, palette } from './src/lib/design-tokens'

/**
 * The theme is read from src/lib/design-tokens.ts rather than written here, so
 * the classes and the few components that need a raw CSS colour cannot drift
 * apart. Change the palette there and both follow.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...palette, danger },
      fontFamily: { display: [...fonts.display], sans: [...fonts.sans] },
      boxShadow: {
        card: '0 1px 2px rgba(26, 26, 46, 0.04), 0 8px 24px -12px rgba(26, 26, 46, 0.18)',
        'card-hover': '0 2px 4px rgba(26, 26, 46, 0.06), 0 16px 40px -16px rgba(26, 26, 46, 0.28)',
        gold: '0 8px 24px -10px rgba(201, 168, 76, 0.6)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
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
  plugins: [],
} satisfies Config
