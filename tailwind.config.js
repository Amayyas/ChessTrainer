/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette du cahier des charges, section 4.1 — Identite visuelle
        ebene: '#1A1A2E',
        or: '#C9A84C',
        ivoire: '#F5F0E8',
        ardoise: '#4A4A5A',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
