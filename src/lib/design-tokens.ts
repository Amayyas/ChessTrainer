/**
 * Every colour and typeface the app uses, in one place.
 *
 * Tailwind reads this file for its theme, and the few components that need a
 * colour as a plain string — the boards, whose colours reach chessground and
 * their stylesheet as values rather than class names — import from here too.
 * So a change of palette is a change to this file, and nothing else.
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
 *
 * The boards read them: chessground animates the pieces, and board.css fades a
 * new arrow in.
 */
export const durations = {
  piece: 140,
  arrow: 120,
} as const

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
 * The board, set as a chess column prints its diagram: the light squares on
 * the bright paper, the dark ones hatched in ink at 45°, and the corrector's
 * red for the move just played, a king in check and the coach's arrow. The
 * plain variant fills the dark squares with the diagram's grey instead, for
 * long sessions, when a hatch tires the eye.
 */
export const board = {
  light: newsprint.paper.bright,
  /** The hatch over a dark square: an ink stripe every 7 units of a 100-unit square, 2.3 wide. */
  hatch: { colour: newsprint.ink.DEFAULT, period: 7, stripe: 2.3 },
  /** The dark squares of the plain variant. */
  plain: '#CFC6B3',
  /** The squares of the move just played. */
  lastMove: alpha(newsprint.rubric, 0.22),
  /** The king in check, which also takes a rubric rule. */
  check: alpha(newsprint.rubric, 0.3),
  /** Where a selected piece may go: an ink dot, or a ring round a piece it takes. */
  destination: alpha(newsprint.ink.DEFAULT, 0.7),
  /** The coach's arrow. */
  arrow: { colour: newsprint.rubric, opacity: 0.86 },
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
 * The widths were measured in Chromium at every size and weight of the type
 * scale that the pages set, once each. Newsreader's optical-size axis sets its
 * roman narrowest at 18 px and wider below and above, so no one scale fits
 * every size, and the faces split where the sizes do: the regular weights are
 * measured on text, 15 to 22 px; medium, which only the headlines use, on the
 * headlines, 32 to 64 px; the bold on the 13 px capitals of labels and buttons
 * and on 15 to 64 px semibold and bold. Each value is the geometric mean over
 * its sizes, and is off by up to five per cent at the ends of the text, three
 * on the headlines and eight on bold text. The bold capitals stray further:
 * Newsreader's set twelve per cent wider than the scaled Georgia's (nineteen
 * against Noto Serif), enough for a row of buttons to wrap onto one line fewer
 * in the fallback. The italic has no optical-size axis, so its scale holds at
 * every size, and it has faces of its own because a slanted roman would set
 * wider than Newsreader's italic.
 *
 * Georgia covers macOS, iOS and Windows; Times New Roman, Liberation Serif and
 * Tinos share one set of metrics and cover Linux and ChromeOS; Noto Serif, and
 * Droid Serif before it, covers Android.
 */
export const fallbackFaces = [
  {
    family: 'Newsreader Fallback Georgia',
    local: ['Georgia'],
    style: 'normal',
    weight: '200 449',
    sizeAdjust: 0.9252,
  },
  {
    family: 'Newsreader Fallback Georgia',
    local: ['Georgia'],
    style: 'normal',
    weight: '450 549',
    sizeAdjust: 0.9841,
  },
  {
    family: 'Newsreader Fallback Georgia',
    local: ['Georgia Bold', 'Georgia-Bold'],
    style: 'normal',
    weight: '550 800',
    sizeAdjust: 0.8628,
  },
  {
    family: 'Newsreader Fallback Georgia',
    local: ['Georgia Italic', 'Georgia-Italic'],
    style: 'italic',
    weight: '200 549',
    sizeAdjust: 0.8753,
  },
  {
    family: 'Newsreader Fallback Times',
    local: ['Times New Roman', 'TimesNewRomanPSMT', 'Liberation Serif', 'LiberationSerif', 'Tinos'],
    style: 'normal',
    weight: '200 449',
    sizeAdjust: 1.0053,
  },
  {
    family: 'Newsreader Fallback Times',
    local: ['Times New Roman', 'TimesNewRomanPSMT', 'Liberation Serif', 'LiberationSerif', 'Tinos'],
    style: 'normal',
    weight: '450 549',
    sizeAdjust: 1.0693,
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
    style: 'normal',
    weight: '550 800',
    sizeAdjust: 1.0207,
  },
  {
    family: 'Newsreader Fallback Times',
    local: [
      'Times New Roman Italic',
      'TimesNewRomanPS-ItalicMT',
      'Liberation Serif Italic',
      'LiberationSerif-Italic',
      'Tinos Italic',
    ],
    style: 'italic',
    weight: '200 549',
    sizeAdjust: 0.9716,
  },
  {
    family: 'Newsreader Fallback Noto',
    local: ['Noto Serif', 'NotoSerif-Regular', 'Droid Serif', 'DroidSerif'],
    style: 'normal',
    weight: '200 449',
    sizeAdjust: 0.8493,
  },
  {
    family: 'Newsreader Fallback Noto',
    local: ['Noto Serif', 'NotoSerif-Regular', 'Droid Serif', 'DroidSerif'],
    style: 'normal',
    weight: '450 549',
    sizeAdjust: 0.9033,
  },
  {
    family: 'Newsreader Fallback Noto',
    local: ['Noto Serif Bold', 'NotoSerif-Bold', 'Droid Serif Bold', 'DroidSerif-Bold'],
    style: 'normal',
    weight: '550 800',
    sizeAdjust: 0.8751,
  },
  {
    family: 'Newsreader Fallback Noto',
    local: ['Noto Serif Italic', 'NotoSerif-Italic', 'Droid Serif Italic', 'DroidSerif-Italic'],
    style: 'italic',
    weight: '200 549',
    sizeAdjust: 0.8432,
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
      fontStyle: face.style,
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
  /**
   * The chess figurines and the grade signs, from the subset declared in
   * src/index.css; the system symbol fonts after it only if that file fails.
   */
  figurine: ['"Figurines"', '"Segoe UI Symbol"', '"Apple Symbols"', 'serif'],
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
  /** What the masthead promises above the name. */
  promise: 'Gratuit, sans compte obligatoire',
  /** The AGPL obliges the offer of source, so this link is not decorative. */
  sourceUrl: 'https://github.com/Amayyas/ChessTrainer',
} as const
