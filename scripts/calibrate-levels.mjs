/**
 * Play-tests the battle levels below Stockfish 18's floor against its own Elo
 * model.
 *
 * Levels 3-6 set `UCI_Elo` directly, so their rating is the number handed to the
 * engine. Stockfish 18 has no strength below `UCI_Elo` 1320, so the levels under
 * it are weakened by the app instead: the engine reports a few lines and one is
 * drawn by what it costs (src/engine/weakening.ts). This script measures where
 * those levels land — the strongest of them against a `UCI_Elo` 1320 reference,
 * each weaker one against the level above it — and prints the logistic-implied
 * Elo so `src/engine/levels.ts` carries a measured figure.
 *
 * The levels and the draw are imported from src/ under Node's type stripping
 * (from 22.18, under the `engines` floor), so what is measured is what ships.
 *
 * A fixed opening book, each line played from both sides, keeps the sample
 * comparable run to run — but the draw is random, as is `UCI_LimitStrength`'s
 * move choice, so the result is not deterministic. At 26 openings (52
 * games/matchup) a score carries roughly ±90 Elo; run it twice and average.
 * Needs `npx playwright install chromium` once (same as the puzzle importer).
 *
 *   node scripts/calibrate-levels.mjs [--openings N]
 *
 * The engine rules (.claude/rules/engine.md) apply: a score outside ~25-75% only
 * bounds a level ("clearly weaker"), it does not measure it — read those as
 * bounds, not numbers. That is why each weakened level is chained to its
 * neighbour rather than set against a reference it cannot score against.
 */
import { Chess } from 'chess.js'
import { chromium } from '@playwright/test'
import { bootEngine, servePublic } from './lib/stockfish-harness.mjs'
import { ENGINE_LEVELS, UCI_ELO_FLOOR } from '../src/engine/levels.ts'
import { pickCandidate } from '../src/engine/weakening.ts'

const openingsArg = process.argv.indexOf('--openings')
const rawOpenings = openingsArg > 0 ? Number(process.argv[openingsArg + 1]) : 26
if (!Number.isInteger(rawOpenings) || rawOpenings < 1) {
  console.error(`--openings needs a positive integer (got ${process.argv[openingsArg + 1]})`)
  process.exit(1)
}
const OPENINGS = rawOpenings

/** Past a level's own depth cap, `UCI_Elo` governs strength — so a reference at
 *  this depth plays its full rated strength and no more. */
const REFERENCE_DEPTH = 12
/** A game this long is called by material rather than left to crawl. */
const MAX_PLIES = 200
/** Centipawn lead that decides an adjudicated game; below it, a draw. */
const ADJUDICATION_CP = 500

const PIECE_CP = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

/**
 * Sound opening lines, 4-8 ply, spanning the four first moves and both sharp and
 * quiet structures — so the book itself does not hand either engine the game.
 */
const BOOK = [
  '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
  '1. e4 e5 2. Nf3 Nc6 3. d4 exd4',
  '1. e4 e5 2. Nc3 Nf6 3. f4 d5',
  '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6',
  '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 g6',
  '1. e4 c5 2. Nc3 Nc6 3. g3 g6',
  '1. e4 e6 2. d4 d5 3. Nc3 Bb4',
  '1. e4 e6 2. d4 d5 3. Nd2 Nf6',
  '1. e4 c6 2. d4 d5 3. e5 Bf5',
  '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5',
  '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5',
  '1. e4 Nf6 2. e5 Nd5 3. d4 d6',
  '1. d4 d5 2. c4 e6 3. Nc3 Nf6',
  '1. d4 d5 2. c4 c6 3. Nf3 Nf6',
  '1. d4 d5 2. c4 dxc4 3. Nf3 Nf6',
  '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
  '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
  '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6',
  '1. d4 Nf6 2. Nf3 e6 3. c4 b6',
  '1. d4 f5 2. g3 Nf6 3. Bg2 e6',
  '1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6',
  '1. c4 c5 2. Nf3 Nf6 3. Nc3 Nc6',
  '1. Nf3 d5 2. g3 Nf6 3. Bg2 e6',
  '1. Nf3 Nf6 2. c4 c5 3. g3 b6',
  '1. e4 e5 2. Nf3 d6 3. d4 exd4 4. Nxd4 Nf6',
].slice(0, OPENINGS)

/** UCI moves for the opening, from its SAN. */
function openingMoves(san) {
  const chess = new Chess()
  for (const token of san.split(/\s+/)) {
    if (/^\d+\.$/.test(token)) continue
    chess.move(token)
  }
  return chess.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''))
}

/** Material balance in centipawns, from White's point of view. */
function materialCp(chess) {
  let cp = 0
  for (const row of chess.board()) {
    for (const square of row) {
      if (!square) continue
      cp += (square.color === 'w' ? 1 : -1) * PIECE_CP[square.type]
    }
  }
  return cp
}

/** One game. Returns White's score: 1 win, 0.5 draw, 0 loss. */
async function playGame(white, black, opening) {
  const chess = new Chess()
  for (const uci of opening) {
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined })
  }

  while (!chess.isGameOver() && chess.history().length < MAX_PLIES) {
    const engine = chess.turn() === 'w' ? white : black
    const best = await engine.play(chess.fen())
    if (!best || best === '(none)' || best === '0000') break
    chess.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] || undefined })
  }

  if (chess.isCheckmate()) return chess.turn() === 'w' ? 0 : 1
  if (chess.isGameOver()) return 0.5
  const cp = materialCp(chess)
  if (Math.abs(cp) < ADJUDICATION_CP) return 0.5
  return cp > 0 ? 1 : 0
}

/**
 * Boots a player for `config` — a level from levels.ts, or a reference with a
 * `uciElo` and a `depth` — and returns `{ play(fen) }`, which answers with a
 * move the way the battle does: a rated level's `bestmove`, a weakened level's
 * draw from its lines.
 */
async function player(page, name, config) {
  const options = config.weakening
    ? [
        'setoption name UCI_LimitStrength value false',
        `setoption name MultiPV value ${config.weakening.candidates}`,
      ]
    : [
        'setoption name UCI_LimitStrength value true',
        `setoption name UCI_Elo value ${config.uciElo}`,
      ]
  const search = await bootEngine(page, { name, options })
  return {
    async play(fen) {
      const result = await search(fen, config.depth)
      if (!config.weakening) return result.best
      const candidates = result.lines
        .filter((line) => line.move)
        .map((line) => ({
          move: line.move,
          scoreCp: line.kind === 'cp' ? line.value : null,
          scoreMate: line.kind === 'mate' ? line.value : null,
        }))
      return pickCandidate(candidates, config.weakening.temperatureCp) ?? result.best
    },
  }
}

/** Plays `a` against `b` over the whole book, both colours. Score is a's. */
async function matchup(browser, url, label, a, b) {
  const page = await browser.newPage()
  await page.goto(url)
  const engineA = await player(page, 'a', a)
  const engineB = await player(page, 'b', b)

  let score = 0
  let games = 0
  for (const san of BOOK) {
    const opening = openingMoves(san)
    score += await playGame(engineA, engineB, opening)
    games += 1
    score += 1 - (await playGame(engineB, engineA, opening))
    games += 1
    process.stderr.write(`  ${label}: ${games}/${BOOK.length * 2} (${score.toFixed(1)})\r`)
  }
  await page.close()

  const pct = score / games
  const clamped = Math.min(0.99, Math.max(0.01, pct))
  const eloDelta = Math.round(-400 * Math.log10(1 / clamped - 1))
  process.stderr.write(
    `  ${label}: ${score}/${games} = ${(pct * 100).toFixed(1)}%  Δ${eloDelta >= 0 ? '+' : ''}${eloDelta}\n`,
  )
  return { label, score, games, pct, eloDelta }
}

// --- run ------------------------------------------------------------------

/** A `UCI_Elo` yardstick at full rated strength (see REFERENCE_DEPTH). */
const reference = (uciElo) => ({
  label: `ref ${uciElo}`,
  uciElo,
  weakening: null,
  depth: REFERENCE_DEPTH,
})
const WEAKENED = ENGINE_LEVELS.filter((level) => level.weakening)
const FIRST_RATED = ENGINE_LEVELS[WEAKENED.length]
if (WEAKENED.length === 0) {
  console.error('No level below the floor in src/engine/levels.ts: nothing to calibrate.')
  process.exit(1)
}

/**
 * Configurations that ship nowhere and exist to keep the chain measurable. Two
 * levels about 300 apart score ~15% against each other, outside the band where
 * a score discriminates; a bridge between them splits the gap into two steps
 * that each stay inside it. Each sits directly under the level it names.
 */
const BRIDGES = [
  {
    label: 'bridge (6 lines, T 650)',
    under: 'Débutant',
    uciElo: null,
    weakening: { candidates: 6, temperatureCp: 650 },
    depth: 6,
  },
]
for (const bridge of BRIDGES) {
  if (!WEAKENED.some((level) => level.label === bridge.under)) {
    console.error(`Bridge "${bridge.label}" sits under "${bridge.under}", which is not weakened.`)
    process.exit(1)
  }
}

/** Strongest first: each weakened level, then the bridges under it. */
const CHAIN = WEAKENED.toReversed().flatMap((level) => [
  level,
  ...BRIDGES.filter((bridge) => bridge.under === level.label),
])

const { server, port } = await servePublic()
const url = `http://localhost:${port}/`
const browser = await chromium.launch()

const describe = (level) =>
  `${level.label} (MultiPV ${level.weakening.candidates}, T ${level.weakening.temperatureCp}, depth ${level.depth})`
process.stderr.write(
  `calibrating ${WEAKENED.map(describe).join(', ')} over ${BOOK.length} openings x2\n`,
)

// Each matchup runs on its own page, so they play side by side.
const pairs = []
// The strongest weakened level is anchored on the engine's own scale...
const top = CHAIN[0]
pairs.push([top, reference(UCI_ELO_FLOOR)])
// ...and each link below it on the one above, where a score still discriminates.
for (let i = 1; i < CHAIN.length; i += 1) pairs.push([CHAIN[i], CHAIN[i - 1]])
const CHAINED = pairs.length
// Bounds, not measurements: the ladder must still rise into the rated levels,
// and the weakest level must sit clearly under the floor.
pairs.push([top, FIRST_RATED])
if (CHAIN.length > 1) pairs.push([CHAIN.at(-1), reference(UCI_ELO_FLOOR)])

const results = await Promise.all(
  pairs.map(([a, b]) => matchup(browser, url, `${a.label} vs ${b.label}`, a, b)),
)

// Each chained link's figure: the floor plus every Δ down to it. A link that
// scored outside the band only bounds its Δ — at least the band edge's — so
// its figure, and every figure chained below it, is a bound and not a number.
const BAND = [0.25, 0.75]
const deltaAt = (pct) => Math.round(-400 * Math.log10(1 / pct - 1))
let figure = UCI_ELO_FLOOR
let bound = null // null while every link measured; then '<', '>', or 'none' once both
results.forEach((result, i) => {
  if (i >= CHAINED) return
  let delta = result.eloDelta
  let side = null
  if (result.pct < BAND[0]) [delta, side] = [deltaAt(BAND[0]), '<']
  else if (result.pct > BAND[1]) [delta, side] = [deltaAt(BAND[1]), '>']
  if (side) bound = bound && bound !== side ? 'none' : side
  figure += delta
  result.figure =
    bound === null ? `${figure}` : bound === 'none' ? 'unmeasured' : `${bound} ${figure}`
})

await browser.close()
server.close()

// --- report -------------------------------------------------------------

const table = [
  '| matchup | score | % | implied Δ Elo | chained figure |',
  '| --- | --- | --- | --- | --- |',
  ...results.map(
    (r) =>
      `| ${r.label} | ${r.score}/${r.games} | ${(r.pct * 100).toFixed(1)}% | ` +
      `${r.eloDelta >= 0 ? '+' : ''}${r.eloDelta} | ${r.figure ?? 'bound'} |`,
  ),
].join('\n')

// The markdown report goes to stdout; progress went to stderr.
process.stdout.write(`# Calibration of the battle levels below the floor

Run: ${new Date().toISOString()} — ${BOOK.length} openings, both colours (${BOOK.length * 2} games/matchup).
Engine: vendored Stockfish 18 lite-single. References: UCI_LimitStrength + UCI_Elo, depth ${REFERENCE_DEPTH}.
${WEAKENED.map(describe).join('. ')}.
Bridges, measured but not shipped: ${BRIDGES.map((bridge) => `${bridge.label}, under ${bridge.under}`).join('; ') || 'none'}.

${table}

Reading (see .claude/rules/engine.md): a % outside ~25-75 only bounds a level,
and a run carries ~±90 Elo — average two. The first row places ${top.label} on the
engine's own scale (${UCI_ELO_FLOOR} + Δ); each row after it until the bounds
places a link against the one above it, so its figure is the sum of the chain —
and carries the error of every link above it. A link outside the band makes its
figure, and every one below, a bound (< or >) taken at the band's edge.
The last rows are bounds: the ladder rising into ${FIRST_RATED.label}, and the
weakest level well under the floor.
`)
