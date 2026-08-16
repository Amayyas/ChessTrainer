/**
 * Every colour and typeface the app uses, in one place.
 *
 * Tailwind reads this file for its theme, and the few components that need a
 * colour as a plain string — the boards hand theirs to react-chessboard, which
 * takes CSS values rather than class names — import from here too. So a change
 * of palette is a change to this file, and nothing else.
 *
 * Values were previously repeated as literals inside those components, which
 * meant a new palette would have moved the interface while leaving the board
 * squares and the coach arrow on the old one.
 */

/** The four colours of the visual identity. */
export const palette = {
  ebene: { DEFAULT: '#1A1A2E', light: '#25253F' },
  or: { DEFAULT: '#C9A84C', light: '#D9BD6B' },
  ivoire: { DEFAULT: '#F5F0E8', dark: '#ECE4D6' },
  ardoise: '#4A4A5A',
} as const

/** Danger, kept apart from the identity: it means "wrong", not "brand". */
export const danger = '#DC2626'

/** `#RRGGBB` with an alpha channel, as a CSS colour. */
function alpha(hex: string, opacity: number): string {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * The chessboards. react-chessboard styles squares with CSS values, so these
 * cannot be Tailwind classes.
 */
export const board = {
  /** Slightly deeper than `ivoire` so the light squares read against the page. */
  lightSquare: '#EDE6D8',
  darkSquare: palette.ardoise,
  /** The move just played. */
  lastMove: alpha(palette.or.DEFAULT, 0.42),
  /** The piece under the cursor, and the champion in the Piece Hunt. */
  selected: alpha(palette.or.DEFAULT, 0.55),
  /** The king in check. Slightly softer than a Piece Hunt threat, as it was. */
  check: alpha(danger, 0.5),
  /** An enemy that can take the champion in the Piece Hunt. */
  threat: alpha(danger, 0.55),
  /** Where a selected piece may legally go, drawn as a dot. */
  legalTarget: `radial-gradient(circle, ${alpha(palette.ebene.DEFAULT, 0.3)} 22%, transparent 26%)`,
  /** A legal capture, drawn as a ring around the piece rather than a dot. */
  legalCapture:
    `radial-gradient(circle, transparent 55%, ${alpha(palette.ebene.DEFAULT, 0.3)} 56%, ` +
    `${alpha(palette.ebene.DEFAULT, 0.3)} 62%, transparent 63%)`,
  /** The best-move arrow the coach draws. */
  arrow: palette.or.DEFAULT,
} as const

export const fonts = {
  display: ['"Playfair Display"', 'Georgia', 'serif'],
  sans: ['Inter', 'system-ui', 'sans-serif'],
} as const

/**
 * The name and mark, gathered so a rebrand does not mean hunting through the
 * layout, the page title and the social preview for the same two strings.
 */
export const brand = {
  name: 'ChessTrainer',
  fullName: 'ChessTrainer AI',
  /** Stands in for a logo until there is one. */
  mark: '♞',
  tagline: 'Apprenez les échecs avec un coach intelligent',
} as const
