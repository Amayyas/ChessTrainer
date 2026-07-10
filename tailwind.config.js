/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette from the specification, section 4.1 — visual identity
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
