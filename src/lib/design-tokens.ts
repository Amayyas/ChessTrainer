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

/** The one colour that is not in the palette: the surface a card sits on. */
export const surface = '#FFFFFF'

/** `#RRGGBB` to its three channels, 0–255. */
function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16))
  return [r ?? 0, g ?? 0, b ?? 0]
}

/** `#RRGGBB` with an alpha channel, as a CSS colour. */
function alpha(hex: string, opacity: number): string {
  const [r, g, b] = channels(hex)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/** `ratio` of `top` laid over `bottom`, as an opaque `#RRGGBB`. */
function mix(top: string, bottom: string, ratio: number): string {
  const [tr, tg, tb] = channels(top)
  const [br, bg, bb] = channels(bottom)
  const blend = (t: number, b: number) => Math.round(t * ratio + b * (1 - ratio))
  return `#${[blend(tr, br), blend(tg, bg), blend(tb, bb)]
    .map((c) => c.toString(16).padStart(2, '0').toUpperCase())
    .join('')}`
}

/**
 * `#RRGGBB` as the bare `H S% L%` triple, with no `hsl()` around it.
 *
 * That shape is what lets a Tailwind colour be written `hsl(var(--x) /
 * <alpha-value>)`, so `bg-primary/50` keeps working on a variable the same way
 * it does on a hex literal. Two decimals, because rounding the lightness to a
 * whole percent moves `ivoire` by a step of red and the page background would
 * no longer match the `bg-ivoire` used beside it.
 */
function hslTriple(hex: string): string {
  const [r, g, b] = channels(hex).map((c) => c / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2

  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  const trim = (n: number) => Number(n.toFixed(2))
  return `${trim(hue)} ${trim(saturation * 100)}% ${trim(lightness * 100)}%`
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

/**
 * The hairline that separates two surfaces. shadcn components ask for a solid
 * `--border`, while the hand-written components used `ebene/20` over whatever
 * was behind them. This is that blend made opaque, so the two read alike.
 */
const hairline = mix(palette.ebene.DEFAULT, palette.ivoire.DEFAULT, 0.18)

/**
 * The palette expressed under the names shadcn components use.
 *
 * Every shadcn component is written against `bg-primary`, `text-muted-
 * foreground`, `border-border` and the rest, never against a colour. Pointing
 * those names at this palette is what makes a component pulled from
 * ui.shadcn.com arrive in gold and ivory rather than in its default zinc, with
 * no class rewritten by hand in the component file.
 *
 * Tailwind reads it through the plugin in `tailwind.config.ts`, which writes
 * these onto `:root`. So the palette above stays the only place a colour is
 * chosen, and the bridge cannot drift from it.
 */
export const semanticTheme = {
  /** The page, and the ink on it. */
  '--background': hslTriple(palette.ivoire.DEFAULT),
  '--foreground': hslTriple(palette.ebene.DEFAULT),
  /** Cards and popovers: white, lifted off the ivory page. */
  '--card': hslTriple(surface),
  '--card-foreground': hslTriple(palette.ebene.DEFAULT),
  '--popover': hslTriple(surface),
  '--popover-foreground': hslTriple(palette.ebene.DEFAULT),
  /**
   * Gold, with ebony on top. Gold text on a light surface reaches only 2.3:1
   * and fails WCAG AA, which is why the foreground here is not ivory.
   */
  '--primary': hslTriple(palette.or.DEFAULT),
  '--primary-foreground': hslTriple(palette.ebene.DEFAULT),
  '--secondary': hslTriple(palette.ebene.DEFAULT),
  '--secondary-foreground': hslTriple(palette.ivoire.DEFAULT),
  /** The quiet pair: a deeper ivory, with slate on it. */
  '--muted': hslTriple(palette.ivoire.dark),
  '--muted-foreground': hslTriple(palette.ardoise),
  /** What a row or a menu item turns when the pointer is over it. */
  '--accent': hslTriple(palette.ivoire.dark),
  '--accent-foreground': hslTriple(palette.ebene.DEFAULT),
  '--destructive': hslTriple(danger),
  '--destructive-foreground': hslTriple(surface),
  '--border': hslTriple(hairline),
  '--input': hslTriple(hairline),
  /** The focus ring was already gold, per the accessibility rule in index.css. */
  '--ring': hslTriple(palette.or.DEFAULT),
} as const

/**
 * The same names again, for the ebony surfaces: the landing's hero band, the
 * sidebar, the bottom bar, the mobile sheet.
 *
 * Without it, a shadcn component dropped on one of those reads `text-foreground`
 * as ebony and disappears into the background it is sitting on — which is why
 * the landing's two calls to action were a pair of hand-written class strings
 * with a comment saying they were "styled to match the primary Button without
 * being one". The Tailwind plugin exposes this as `.theme-inverse`, and any
 * component inside one picks the inverted pair up through the cascade, with no
 * variant of its own and no `dark:` prefix on anything.
 *
 * Gold stays gold. It is the one colour that does not flip: it is the accent on
 * both grounds, and ebony stays the readable text on top of it.
 */
export const inverseTheme = {
  '--background': hslTriple(palette.ebene.DEFAULT),
  '--foreground': hslTriple(palette.ivoire.DEFAULT),
  '--card': hslTriple(palette.ebene.light),
  '--card-foreground': hslTriple(palette.ivoire.DEFAULT),
  '--popover': hslTriple(palette.ebene.light),
  '--popover-foreground': hslTriple(palette.ivoire.DEFAULT),
  '--primary': hslTriple(palette.or.DEFAULT),
  '--primary-foreground': hslTriple(palette.ebene.DEFAULT),
  '--secondary': hslTriple(palette.ivoire.DEFAULT),
  '--secondary-foreground': hslTriple(palette.ebene.DEFAULT),
  '--muted': hslTriple(palette.ebene.light),
  // The ivory the dark surfaces already use for secondary text, made opaque:
  // it was written `text-ivoire/70` in every one of them.
  '--muted-foreground': hslTriple(mix(palette.ivoire.DEFAULT, palette.ebene.DEFAULT, 0.7)),
  '--accent': hslTriple(palette.ebene.light),
  '--accent-foreground': hslTriple(palette.ivoire.DEFAULT),
  '--destructive': hslTriple(danger),
  '--destructive-foreground': hslTriple(surface),
  // `border-white/10`, which is what all three dark surfaces draw their
  // hairlines with today, resolved against ebony.
  '--border': hslTriple(mix(surface, palette.ebene.DEFAULT, 0.1)),
  '--input': hslTriple(mix(surface, palette.ebene.DEFAULT, 0.1)),
  '--ring': hslTriple(palette.or.DEFAULT),
} as const

/**
 * The corner radius shadcn derives its `lg`, `md` and `sm` from.
 *
 * Deliberately Tailwind's own `rounded-lg`, not the project's `rounded-xl`.
 * Pointing it at `0.875rem` to match the buttons would have moved all 29
 * `rounded-lg` corners already written across the app, silently, in a commit
 * about something else. At `0.5rem` the derived `lg` and `md` come out equal to
 * the values those classes already have, so this override changes nothing on
 * screen. Components that want the rounder corner ask for `rounded-xl`, as they
 * already do.
 */
export const radius = '0.5rem'

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
  /** The AGPL obliges the offer of source, so this link is not decorative. */
  sourceUrl: 'https://github.com/Amayyas/ChessTrainer',
} as const
