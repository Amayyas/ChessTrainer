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

/**
 * The newsprint palette: the chess column of a daily paper.
 *
 * Paper, ink, and one red — the rubric, the colour a corrector writes in. It
 * marks what needs attention and nothing else: a wrong move, the coach's
 * suggestion, the section you are in, keyboard focus. Every text pair the
 * interface sets is checked against WCAG AA in design-tokens.test.ts, so a
 * lighter ink or a brighter red fails there before it reaches a player.
 */
export const newsprint = {
  paper: {
    /** The page. */
    DEFAULT: '#F4F0E6',
    /** Light squares, fields, boxed asides: a sheet laid on the page. */
    bright: '#FBF9F3',
    /** A flat tint, for the rare place a rule alone does not separate. */
    deep: '#E9E3D4',
  },
  ink: {
    /** Text, rules and the primary button. */
    DEFAULT: '#1C1A16',
    /** Captions and secondary text. */
    soft: '#5C564B',
    /** Metadata on the page only: on deep paper it falls below AA. */
    faint: '#6E675B',
  },
  rubric: '#A8311F',
} as const

/**
 * The type scale, each size with its leading.
 *
 * Newsreader carries an optical-size axis that the browser follows from the
 * font size, so a headline gets the high-contrast display cut and body text the
 * sturdier text cut without a class asking for either. The names are also
 * registered with tailwind-merge (src/utils/cn.ts), which would otherwise read
 * `text-body` as a colour and drop it.
 */
export const typeScale = {
  /** The label above a headline, set in capitals: the newspaper's kicker. */
  kicker: ['0.8125rem', { lineHeight: '1.3', letterSpacing: '0.08em' }],
  caption: ['0.9375rem', { lineHeight: '1.45' }],
  body: ['1.125rem', { lineHeight: '1.55' }],
  /** The standfirst under a headline. */
  lead: ['1.375rem', { lineHeight: '1.45' }],
  heading: ['1.3125rem', { lineHeight: '1.25' }],
  title: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.005em' }],
  /** The title a page opens with, from 640 px up; below that it is `title`. */
  headline: ['3rem', { lineHeight: '1.05', letterSpacing: '-0.012em' }],
  display: ['4rem', { lineHeight: '1.02', letterSpacing: '-0.012em' }],
} satisfies Record<string, [string, { lineHeight: string; letterSpacing?: string }]>

/**
 * How long things move, in milliseconds. A piece glides to its square and the
 * coach's arrow fades in; nothing else animates, nothing enters on arrival and
 * nothing lifts under the pointer. Under prefers-reduced-motion both are zero.
 * The framer-motion timings in src/lib/motion.ts leave with the entrance
 * animations they drive.
 */
export const durations = {
  piece: 140,
  arrow: 120,
} as const

/**
 * The previous identity's four colours.
 *
 * The components still read them while they move to the newsprint tokens one
 * pull request at a time; they go with the last component that uses them.
 */
export const palette = {
  ebene: { DEFAULT: '#1A1A2E', light: '#25253F' },
  or: { DEFAULT: '#C9A84C', light: '#D9BD6B' },
  ivoire: { DEFAULT: '#F5F0E8', dark: '#ECE4D6' },
  ardoise: '#4A4A5A',
} as const

/** Danger, kept apart from the identity: it means "wrong", not "brand". */
export const danger = '#DC2626'

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
 * Newsreader's vertical metrics, as fractions of the em, from the font's own
 * hhea and OS/2 tables: 1470 and 530 of 2000 units, no line gap. A fallback
 * given these sets lines of the same height, on the same baseline.
 */
export const newsreaderMetrics = { ascent: 0.735, descent: 0.265, lineGap: 0 } as const

/**
 * Local serifs reshaped to Newsreader's metrics, shown while the web font loads.
 *
 * Without them the page first lays out in Georgia, which sets wider than
 * Newsreader and has a line box 14% taller, then reflows when Newsreader
 * arrives: on the landing that one swap measured a cumulative layout shift of
 * 0.16 and cost the Lighthouse performance score its pass. Each face scales a
 * local serif to Newsreader's width (`sizeAdjust`) and gives it Newsreader's
 * vertical metrics, so the swap moves the page by a line at most rather than
 * by several. The preload in vite.config.ts makes the swap itself rare; these
 * cover the visits it does not.
 *
 * The widths were measured in Chromium at the sizes the interface sets today,
 * 14 to 18 px for text and 14 to 48 px for bold. Newsreader's optical-size axis
 * makes its width relative to a fixed serif drift by about ten per cent across
 * that range, so each value is the geometric mean over it, per weight range,
 * and is off by up to five per cent at either end. They are measured again when
 * the pages move to the type scale above, whose sizes differ. Georgia covers
 * macOS, iOS and Windows; Times New Roman, Liberation Serif and Tinos share one
 * set of metrics and cover Linux and ChromeOS; Noto Serif, and Droid Serif
 * before it, covers Android. There are no italic faces yet: nothing is set in
 * italic until the pages move over.
 */
export const fallbackFaces = [
  {
    family: 'Newsreader Fallback Georgia',
    local: ['Georgia'],
    weight: '200 549',
    sizeAdjust: 0.9498,
  },
  {
    family: 'Newsreader Fallback Georgia',
    local: ['Georgia Bold', 'Georgia-Bold'],
    weight: '550 800',
    sizeAdjust: 0.8728,
  },
  {
    family: 'Newsreader Fallback Times',
    local: ['Times New Roman', 'TimesNewRomanPSMT', 'Liberation Serif', 'LiberationSerif', 'Tinos'],
    weight: '200 549',
    sizeAdjust: 1.0321,
  },
  {
    family: 'Newsreader Fallback Times',
    local: [
      'Times New Roman Bold',
      'TimesNewRomanPS-BoldMT',
      'Liberation Serif Bold',
      'LiberationSerif-Bold',
      'Tinos Bold',
    ],
    weight: '550 800',
    sizeAdjust: 1.044,
  },
  {
    family: 'Newsreader Fallback Noto',
    local: ['Noto Serif', 'NotoSerif-Regular', 'Droid Serif', 'DroidSerif'],
    weight: '200 549',
    sizeAdjust: 0.8717,
  },
  {
    family: 'Newsreader Fallback Noto',
    local: ['Noto Serif Bold', 'NotoSerif-Bold', 'Droid Serif Bold', 'DroidSerif-Bold'],
    weight: '550 800',
    sizeAdjust: 0.8788,
  },
] as const

/**
 * The fallbacks as @font-face rules, for Tailwind's addBase. The overrides are
 * derived from Newsreader's metrics and each face's scale here rather than
 * written out, so they cannot disagree with the scale they depend on.
 */
export function fallbackFontFaces() {
  const percent = (value: number) => `${Number((value * 100).toFixed(2))}%`
  return fallbackFaces.map((face) => ({
    '@font-face': {
      fontFamily: `'${face.family}'`,
      src: face.local.map((name) => `local('${name}')`).join(', '),
      fontWeight: face.weight,
      sizeAdjust: percent(face.sizeAdjust),
      ascentOverride: percent(newsreaderMetrics.ascent / face.sizeAdjust),
      descentOverride: percent(newsreaderMetrics.descent / face.sizeAdjust),
      lineGapOverride: percent(newsreaderMetrics.lineGap / face.sizeAdjust),
    },
  }))
}

/**
 * One family: Newsreader, a news serif self-hosted through @fontsource-variable
 * (src/lib/fonts.ts). Headlines, body, buttons and numbers are all set in it.
 * The first name is the one the package's @font-face rules declare; the tests
 * read it back from the package, because a name that matches no @font-face does
 * not fail — the text quietly falls back and looks almost right. The fallbacks
 * follow, read from the faces above so the two lists cannot drift apart.
 *
 * Only the build and the tests read this, so the stack comes from a call marked
 * pure: without the mark the bundler cannot prove that building it has no
 * effect, and the whole table of faces ships to every visitor and runs on every
 * page load.
 */
function serifStack(): string[] {
  return [
    '"Newsreader Variable"',
    ...new Set(fallbackFaces.map((face) => `"${face.family}"`)),
    'serif',
  ]
}

export const fonts = {
  serif: /* @__PURE__ */ serifStack(),
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
