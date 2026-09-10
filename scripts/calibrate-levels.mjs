/**
 * Play-tests the two weakest battle levels against Stockfish 18's own Elo model.
 *
 * Levels 3-6 set `UCI_Elo` directly, so their rating is the number handed to the
 * engine. Levels 1-2 can't: Stockfish 18 has no strength below `UCI_Elo` 1320,
 * so both sit at that floor and differ only by a search-depth cap (4 vs 6). This
 * script measures where they actually land by playing them against `UCI_Elo`
 * references and against each other, then prints the logistic-implied Elo so
 * `src/engine/levels.ts` can carry an honest figure instead of a placeholder.
 *
 * A fixed opening book, each line played from both sides, keeps the sample
 * comparable run to run — but Stockfish's `UCI_LimitStrength` picks moves with
 * time-seeded randomness, so the result is not deterministic. At 26 openings
 * (52 games/matchup) a score carries roughly ±90 Elo; run it twice and average.
 * Needs `npx playwright install chromium` once (same as the puzzle importer).
 *
 *   node scripts/calibrate-levels.mjs [--openings N]
 *
 * The engine rules (.claude/rules/engine.md) apply: a score outside ~25-75% only
 * bounds a level ("clearly weaker"), it does not measure it — read those as
 * bounds, not numbers.
 */
import { Chess } from 'chess.js'
import { chromium } from '@playwright/test'
import { bootEngine, servePublic } from './lib/stockfish-harness.mjs'

/** Levels 1 and 2 as shipped — keep in step with src/engine/levels.ts. Held here
 *  rather than imported: nothing else in scripts/ imports a .ts module, and
 *  type-stripping only lands in the supported Node range from 22.18. */
const L1 = { uciElo: 1320, depth: 4 }
const L2 = { uciElo: 1320, depth: 6 }

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
    const { best } = await engine.search(chess.fen(), engine.depth)
    if (!best || best === '(none)' || best === '0000') break
    chess.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] || undefined })
  }

  if (chess.isCheckmate()) return chess.turn() === 'w' ? 0 : 1
  if (chess.isGameOver()) return 0.5
  const cp = materialCp(chess)
  if (Math.abs(cp) < ADJUDICATION_CP) return 0.5
  return cp > 0 ? 1 : 0
}

const limitStrength = (elo) => [
  'setoption name UCI_LimitStrength value true',
  `setoption name UCI_Elo value ${elo}`,
]

/** Plays `a` against `b` over the whole book, both colours. Score is a's. */
async function matchup(browser, url, label, a, b) {
  const page = await browser.newPage()
  await page.goto(url)
  const engineA = {
    search: await bootEngine(page, { name: 'a', options: a.options }),
    depth: a.depth,
  }
  const engineB = {
    search: await bootEngine(page, { name: 'b', options: b.options }),
    depth: b.depth,
  }

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

/** A level at the 1320 floor with a given depth cap. */
const floor = (depth) => ({ options: limitStrength(L1.uciElo), depth })
const asRef = (elo) => ({ options: limitStrength(elo), depth: REFERENCE_DEPTH })

const { server, port } = await servePublic()
const url = `http://localhost:${port}/`
const browser = await chromium.launch()

process.stderr.write(
  `calibrating L1 (uciElo ${L1.uciElo}, depth ${L1.depth}) and ` +
    `L2 (uciElo ${L2.uciElo}, depth ${L2.depth}) over ${BOOK.length} openings x2\n`,
)

const run = (label, a, b) => matchup(browser, url, label, a, b)
const results = []

// The problem: the two levels as shipped (both uciElo 1320, depth 4 vs 6) are
// the same opponent, and where that opponent lands on the engine's own scale.
results.push(await run(`L1 d${L1.depth} vs L2 d${L2.depth}`, floor(L1.depth), floor(L2.depth)))
results.push(await run(`L1 d${L1.depth} vs ref 1320`, floor(L1.depth), asRef(1320)))
results.push(await run(`L2 d${L2.depth} vs ref 1320`, floor(L2.depth), asRef(1320)))

// Is the depth cap a lever at the floor, going shallower or deeper? These decide
// whether level 2 can be given a real gap by depth alone.
results.push(await run(`L1 d${L1.depth} vs d2`, floor(L1.depth), floor(2)))
results.push(await run('d2 vs ref 1320', floor(2), asRef(1320)))
results.push(await run(`L1 d${L1.depth} vs d10`, floor(L1.depth), floor(10)))
results.push(await run('d10 vs ref 1500', floor(10), asRef(1500)))

await browser.close()
server.close()

// --- report -------------------------------------------------------------

const table = [
  '| matchup | score | % | implied Δ Elo |',
  '| --- | --- | --- | --- |',
  ...results.map(
    (r) =>
      `| ${r.label} | ${r.score}/${r.games} | ${(r.pct * 100).toFixed(1)}% | ` +
      `${r.eloDelta >= 0 ? '+' : ''}${r.eloDelta} |`,
  ),
].join('\n')

// The markdown report goes to stdout; progress went to stderr.
process.stdout.write(`# Battle level 1-2 calibration

Run: ${new Date().toISOString()} — ${BOOK.length} openings, both colours (${BOOK.length * 2} games/matchup).
Engine: vendored Stockfish 18 lite-single. References: UCI_LimitStrength + UCI_Elo, depth ${REFERENCE_DEPTH}.
L1 = uciElo ${L1.uciElo} depth ${L1.depth}. L2 = uciElo ${L2.uciElo} depth ${L2.depth}.

${table}

Reading (see .claude/rules/engine.md): a % outside ~25-75 only bounds a level,
and a run carries ~±90 Elo — average two. "L1 d4 vs L2 d6" is the gap the shipped
config produces. The "vs d2" / "vs d10" rows ask whether the depth cap is a lever
at all near the floor; "vs ref" rows place a config on the engine's own scale.
`)
