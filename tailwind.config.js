/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette from the specification, section 4.1 — visual identity
        ebene: {
          DEFAULT: '#1A1A2E',
          light: '#25253f',
        },
        or: {
          DEFAULT: '#C9A84C',
          light: '#D9BD6B',
        },
        ivoire: {
          DEFAULT: '#F5F0E8',
          dark: '#ECE4D6',
        },
        ardoise: '#4A4A5A',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
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
}
