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
      },
    },
  },
  plugins: [],
} satisfies Config
