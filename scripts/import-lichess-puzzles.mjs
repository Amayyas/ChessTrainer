/**
 * Rebuilds src/features/puzzle/puzzles.ts from the Lichess Open Database.
 *
 * The old generator played random games and hoped a tactic fell out. This one
 * draws from ~6M rated, human-solved, human-tagged puzzles
 * (database.lichess.org, CC0) — far better material — and keeps our own
 * guarantee by re-screening every solver move with the vendored Stockfish: a
 * puzzle survives only when the engine agrees each of those moves is the one
 * right answer. A "solved but marked wrong" is the one failure this mode must
 * never have.
 *
 * The download is not committed (~300 MB). Needs Node >= 22.15 for zstd, and a
 * one-off `npx playwright install chromium` for the re-screen; reads the .zst
 * directly, no decompression tool:
 *   npx playwright install chromium
 *   curl -L -o lichess_db_puzzle.csv.zst \
 *     https://database.lichess.org/lichess_db_puzzle.csv.zst
 *   node scripts/import-lichess-puzzles.mjs lichess_db_puzzle.csv.zst \
 *     > src/features/puzzle/puzzles.ts
 *
 * Progress and the summary go to stderr; only the file goes to stdout.
 */
import { createReadStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { createZstdDecompress } from 'node:zlib'
import { Chess } from 'chess.js'
import { chromium } from '@playwright/test'
import prettier from 'prettier'
import { bootEngine, servePublic } from './lib/stockfish-harness.mjs'

/** Where the workflow redirects stdout — used to resolve the Prettier config. */
const PUZZLE_OUT = fileURLToPath(new URL('../src/features/puzzle/puzzles.ts', import.meta.url))

const CSV = process.argv[2]
if (!CSV) {
  console.error('usage: node scripts/import-lichess-puzzles.mjs <lichess_db_puzzle.csv.zst>')
  process.exit(1)
}

const RATING_MIN = 700
const RATING_MAX = 2200
/** The rating span is cut into buckets this wide and each is filled evenly, so
 *  the pool ramps smoothly instead of bunching at the popular mid-ratings. */
const BUCKET = 150
/** Kept per bucket (→ 1500 total), and collected per bucket before the
 *  re-screen — a little over, since a few Lichess keys lose it. */
const PER_BUCKET = 150
const COLLECT_PER_BUCKET = 240
/** Lichess popularity is -100..100 (net up/down votes). */
const MIN_POPULARITY = 90
const MIN_PLAYS = 400
/** Re-screen depth and the centipawn margin a non-mate key must clear. */
const SCREEN_DEPTH = 12
const MIN_GAP_CP = 150
/** A non-mate puzzle where the second-best move already leaves the solver this
 *  far ahead was won without the tactic — nothing to teach. */
const MAX_SECOND_BEST = 250

/**
 * Lichess tags every puzzle with several themes. We store one, most-specific
 * first. Mate themes keep the `mat-en-N` slug the dataset test relies on.
 */
const MATE_THEME = { mateIn1: 'mat-en-1', mateIn2: 'mat-en-2', mateIn3: 'mat-en-3' }
const MOTIF_THEME = [
  ['fork', 'fourchette'],
  ['pin', 'clouage'],
  ['skewer', 'enfilade'],
  ['discoveredAttack', 'attaque-decouverte'],
  ['doubleCheck', 'echec-double'],
  ['sacrifice', 'sacrifice'],
  ['deflection', 'deviation'],
  ['attraction', 'attraction'],
  ['hangingPiece', 'piece-en-prise'],
]

/** The stored theme, or null when nothing we present applies. */
function themeOf(themes) {
  for (const [tag, slug] of Object.entries(MATE_THEME)) if (themes.has(tag)) return slug
  for (const [tag, slug] of MOTIF_THEME) if (themes.has(tag)) return slug
  return themes.has('mate') ? null : 'gain-materiel'
}

const uciToMove = (uci) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })

/**
 * A Lichess row → our Puzzle, or null when it does not fit. The row's FEN is
 * the position *before* the opponent's move; applying `moves[0]` gives the
 * position the solver sees, and `moves.slice(1)` is the solution.
 */
function toPuzzle(row) {
  // A real row has 11 fields; a torn stream can hand back a truncated last line.
  if (row.length < 8) return null
  const [, fen, moveList, ratingText, , popularityText, playsText, themeText] = row
  const rating = Number(ratingText)
  if (!Number.isFinite(rating) || rating < RATING_MIN || rating > RATING_MAX) return null
  if (Number(popularityText) < MIN_POPULARITY || Number(playsText) < MIN_PLAYS) return null

  const themes = new Set(themeText.split(' '))
  if (themes.has('veryLong')) return null
  const theme = themeOf(themes)
  if (!theme) return null

  const moves = moveList.split(' ')
  // setup + solver-first-and-last means an even count. Mates run to mate-in-3
  // (6); other lines stop at two solver moves (4), since a longer non-mate line
  // has intermediate solver moves whose "one right answer" we would also have
  // to police.
  const isMate = theme.startsWith('mat-en-')
  const maxMoves = isMate ? 6 : 4
  if (moves.length < 2 || moves.length > maxMoves || moves.length % 2 !== 0) return null

  let chess
  try {
    chess = new Chess(fen)
    if (!chess.move(uciToMove(moves[0]))) return null
  } catch {
    return null
  }

  const solverFen = chess.fen()
  const sideToMove = chess.turn()
  const solution = moves.slice(1)

  // Replay the whole line; a mate theme must actually mate at the end.
  try {
    for (const uci of solution) if (!chess.move(uciToMove(uci))) return null
  } catch {
    return null
  }
  if (isMate) {
    if (!chess.isCheckmate()) return null
    if (solution.length !== Number(theme.slice(-1)) * 2 - 1) return null
  }

  return { id: '', fen: solverFen, solution, theme, rating, sideToMove }
}

/** cp from the side to move's frame, a mate scaled so a faster one scores well
 *  above a slower one (100 cp per move to mate). */
function toCp(line) {
  if (!line) return null
  if (line.kind === 'mate') return Math.sign(line.value) * (MATE_CP - Math.abs(line.value) * 100)
  return line.value
}
const MATE_CP = 100_000

/**
 * Stockfish, from `fen`, plays `expected` and it is the one forced mate — no
 * other move mates in the same length or fewer. A slower alternative mate is
 * fine (the puzzle asks for the fastest).
 */
function forcesMate({ best, first, second }, expected) {
  if (best !== expected || first?.kind !== 'mate' || first.value <= 0) return false
  if (!second || second.kind !== 'mate' || second.value <= 0) return true
  return second.value > first.value
}

/**
 * Stockfish, from `fen`, plays `expected` and it is clear of the alternative by
 * MIN_GAP_CP.
 */
function isDecisive({ best, first, second }, expected) {
  if (best !== expected || !first) return false
  return !second || toCp(first) - toCp(second) >= MIN_GAP_CP
}

/**
 * Re-screens the solver's moves: on each one Stockfish must agree the stored
 * move is the one right answer, or the puzzle is dropped, since a near-equal
 * alternative is a "solved but marked wrong". Which test applies is decided by
 * what Stockfish sees — a forced mate or a plain edge — not by the Lichess
 * theme string.
 *
 * The exception is the final blow when it is itself a checkmate: those often
 * have a legal twin, which usePuzzleSession forgives, so pinning them here
 * would only cost good puzzles. The key move of a non-mate line must also leave
 * a position that is not already won without the tactic — nothing to teach
 * otherwise.
 */
async function lineSurvives(puzzle, search) {
  const lastPly = puzzle.solution.length - 1
  const board = new Chess(puzzle.fen)
  for (let ply = 0; ply < puzzle.solution.length; ply += 1) {
    const move = uciToMove(puzzle.solution[ply])
    if (ply % 2 === 0) {
      const after = new Chess(board.fen())
      after.move(move)
      if (!(ply === lastPly && after.isCheckmate())) {
        const result = await search(board.fen(), SCREEN_DEPTH)
        const forced = result.first?.kind === 'mate' && result.first.value > 0
        if (
          forced
            ? !forcesMate(result, puzzle.solution[ply])
            : !isDecisive(result, puzzle.solution[ply])
        )
          return false
        if (ply === 0 && !forced && Math.abs(toCp(result.second) ?? 0) > MAX_SECOND_BEST)
          return false
      }
    }
    board.move(move)
  }
  return true
}

// --- collect ---------------------------------------------------------------

/**
 * Byte offset where the real zstd stream begins. The Lichess export starts with
 * a skippable frame (magic 0x184D2A50–5F, then a 4-byte little-endian length),
 * which Node's streaming decompressor rejects instead of skipping.
 */
async function zstdBodyStart(path) {
  const file = await open(path)
  try {
    const { buffer } = await file.read({ buffer: Buffer.alloc(16), position: 0 })
    const magic = buffer.readUInt32LE(0)
    if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) return 8 + buffer.readUInt32LE(4)
    return 0
  } finally {
    await file.close()
  }
}

const BUCKETS = []
for (let low = RATING_MIN; low < RATING_MAX; low += BUCKET) BUCKETS.push(low)
const bucketOf = (rating) =>
  BUCKETS[Math.min(Math.floor((rating - RATING_MIN) / BUCKET), BUCKETS.length - 1)]
const collected = Object.fromEntries(BUCKETS.map((low) => [low, []]))
const full = () => BUCKETS.every((low) => collected[low].length >= COLLECT_PER_BUCKET)

let scanDone = false
const zstd = createReadStream(CSV, { start: await zstdBodyStart(CSV) }).pipe(createZstdDecompress())
// Breaking out of the loop below tears the decompressor down mid-stream, which
// it reports as an error. That one is expected; anything before we are done
// reading is not.
zstd.on('error', (error) => {
  if (scanDone) return
  console.error(error)
  process.exit(1)
})
const reader = createInterface({ input: zstd, crlfDelay: Infinity })

let header = true
let scanned = 0
for await (const line of reader) {
  if (header) {
    header = false
    continue
  }
  scanned += 1
  if (scanned % 500000 === 0) {
    const filled = BUCKETS.filter((low) => collected[low].length >= COLLECT_PER_BUCKET).length
    process.stderr.write(
      `  scanned ${scanned / 1000}k — ${filled}/${BUCKETS.length} buckets full\n`,
    )
  }
  // No column we read contains a comma (FEN and move lists are space-separated).
  const puzzle = toPuzzle(line.split(','))
  if (!puzzle) continue
  const bucket = collected[bucketOf(puzzle.rating)]
  if (bucket.length < COLLECT_PER_BUCKET) bucket.push(puzzle)
  // Breaking the for-await closes the interface and its input stream.
  if (full()) break
}
scanDone = true

const candidates = BUCKETS.flatMap((low) => collected[low])
process.stderr.write(
  `collected ${candidates.length} candidates from ${scanned} rows ` +
    `(${BUCKETS.map((low) => collected[low].length).join('/')}); screening at depth ${SCREEN_DEPTH}\n`,
)

// --- screen --------------------------------------------------------------

const { server, port } = await servePublic()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`http://localhost:${port}/`)
const search = await bootEngine(page, {
  name: 'screen',
  options: ['setoption name MultiPV value 2'],
})

const kept = []
for (const [index, puzzle] of candidates.entries()) {
  if (await lineSurvives(puzzle, search)) kept.push(puzzle)
  if ((index + 1) % 100 === 0) {
    process.stderr.write(`  screened ${index + 1}/${candidates.length}, kept ${kept.length}\n`)
  }
}

await browser.close()
server.close()

// --- emit ---------------------------------------------------------------

// PER_BUCKET from every rating bucket, so the pool ramps evenly; `kept` keeps
// scan order within a bucket, which is uncorrelated with the finer rating. Then
// order the whole pool easiest first and give it stable ids.
const byBucket = Object.fromEntries(BUCKETS.map((low) => [low, []]))
for (const puzzle of kept) byBucket[bucketOf(puzzle.rating)].push(puzzle)
const pool = BUCKETS.flatMap((low) => byBucket[low].slice(0, PER_BUCKET)).sort(
  (x, y) => x.rating - y.rating,
)
pool.forEach((puzzle, index) => {
  puzzle.id = `ct-${String(index + 1).padStart(4, '0')}`
})

// Every slug assigned above must have its own label in types.ts — puzzles.test.ts
// ("gives every theme a French label of its own") is what enforces it.

process.stderr.write(
  `kept ${kept.length}, emitting ${pool.length} ` +
    `(${BUCKETS.map((low) => Math.min(byBucket[low].length, PER_BUCKET)).join('/')})\n`,
)

const source = `/**
 * Tactical puzzles for the puzzle mode.
 *
 * Imported from the Lichess Open Database (https://database.lichess.org, CC0)
 * by scripts/import-lichess-puzzles.mjs, then re-screened: a puzzle is kept
 * only when the vendored Stockfish agrees its first move is uniquely and
 * decisively best, so a correct answer can never be marked wrong. Bundling the
 * set keeps the puzzles offline and free of a runtime database dependency.
 *
 * DO NOT EDIT BY HAND — regenerate with the script.
 */
import type { Puzzle } from '@/features/puzzle/types'

export const PUZZLES: readonly Puzzle[] = ${JSON.stringify(pool)}
`

// Match the repo's style, so re-running produces no spurious diff.
const config = (await prettier.resolveConfig(PUZZLE_OUT)) ?? {}
process.stdout.write(await prettier.format(source, { ...config, parser: 'typescript' }))
