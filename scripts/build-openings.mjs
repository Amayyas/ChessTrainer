/**
 * Builds src/features/coach/openings.data.ts — the opening book the coach
 * names openings from — out of the Lichess opening table.
 *
 * The table (github.com/lichess-org/chess-openings, CC0) lists some 3900 named
 * lines as a PGN each. Every position along every line is part of the book, so
 * a game that has played only book positions is still in theory; the position
 * a line ends on carries its name. Positions are matched rather than move
 * orders, so a transposition finds its opening.
 *
 * Replaying the table takes about a second of main thread, so it is done here
 * once and the coach ships the result: each position as a 32-bit hash
 * (src/features/coach/positionHash.ts, shared with the coach so both sides hash
 * alike), and the names in French (scripts/lib/openings-fr.mjs).
 *
 * The table is read at a pinned commit, so a run is reproducible; move COMMIT
 * to take a newer one, and re-run:
 *   npm run build:openings
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import prettier from 'prettier'
import { FAMILIES, VARIATIONS } from './lib/openings-fr.mjs'
// Under Node's type stripping, as scripts/calibrate-levels.mjs reads the levels.
import { positionHash } from '../src/features/coach/positionHash.ts'

const COMMIT = '3ba6b20d31b2e6125cb0e6a2e792f400717d9d39'
const SOURCE = `https://raw.githubusercontent.com/lichess-org/chess-openings/${COMMIT}`
const OUT = fileURLToPath(new URL('../src/features/coach/openings.data.ts', import.meta.url))

/** English words that would mean a name went out untranslated. */
const ENGLISH = /\b(Opening|Defense|Variation|Attack|Game|Accepted|Declined|Line|System)\b/

function fail(message) {
  console.error(message)
  process.exit(1)
}

// --- read -----------------------------------------------------------------

const rows = []
for (const file of ['a', 'b', 'c', 'd', 'e']) {
  const response = await fetch(`${SOURCE}/${file}.tsv`)
  if (!response.ok) fail(`${file}.tsv: HTTP ${response.status}`)
  const [header, ...lines] = (await response.text()).trim().split('\n')
  if (header !== 'eco\tname\tpgn') fail(`${file}.tsv: unexpected header "${header}"`)
  for (const line of lines) {
    const [eco, name, pgn] = line.split('\t')
    rows.push({ eco, name, pgn })
  }
}

// --- name -----------------------------------------------------------------

const names = new Set(rows.map((row) => row.name))
for (const key of Object.keys(VARIATIONS)) {
  if (!names.has(key)) fail(`openings-fr.mjs names "${key}", which is not in the table`)
}

/**
 * The French name for an English one: the line's own, else its nearest named
 * ancestor's ("Family: A, B, C" → "Family: A, B" → "Family: A"), else the
 * family's.
 */
function frenchName(name) {
  const colon = name.indexOf(': ')
  const family = colon === -1 ? name : name.slice(0, colon)
  if (!(family in FAMILIES)) fail(`openings-fr.mjs has no French name for the family "${family}"`)
  if (colon !== -1) {
    const parts = name.slice(colon + 2).split(', ')
    for (let length = parts.length; length > 0; length -= 1) {
      const ancestor = `${family}: ${parts.slice(0, length).join(', ')}`
      if (ancestor in VARIATIONS) return VARIATIONS[ancestor]
    }
  }
  return FAMILIES[name] ?? FAMILIES[family]
}

for (const french of [...Object.values(FAMILIES), ...Object.values(VARIATIONS)]) {
  if (ENGLISH.test(french)) fail(`"${french}" still reads as English`)
}

// --- replay ---------------------------------------------------------------

/** Every book position, by hash: the label index of the line ending there, or -1. */
const book = new Map()
/** The FEN behind each hash, to tell a collision from the same position. */
const fenOf = new Map()
const labels = []
const labelIndex = new Map()
let duplicates = 0

function record(fen, label) {
  const hash = positionHash(fen)
  const key = fen.split(' ').slice(0, 4).join(' ')
  const known = fenOf.get(hash)
  if (known !== undefined && known !== key) fail(`hash collision: "${known}" and "${key}"`)
  fenOf.set(hash, key)
  if (label === -1) {
    if (!book.has(hash)) book.set(hash, -1)
  } else if ((book.get(hash) ?? -1) === -1) {
    book.set(hash, label)
  } else if (book.get(hash) !== label) {
    // Two lines ending on one position: the first, in the table's ECO order.
    duplicates += 1
  }
}

for (const row of rows) {
  const chess = new Chess()
  const moves = row.pgn
    .replace(/\d+\.\s*/g, ' ')
    .trim()
    .split(/\s+/)
  const fens = []
  for (const san of moves) {
    try {
      chess.move(san)
    } catch {
      fail(`${row.name}: illegal move ${san} in "${row.pgn}"`)
    }
    fens.push(chess.fen())
  }
  for (const fen of fens.slice(0, -1)) record(fen, -1)

  const label = `${row.eco}\t${frenchName(row.name)}`
  if (!labelIndex.has(label)) {
    labelIndex.set(label, labels.length)
    labels.push(label)
  }
  record(fens.at(-1), labelIndex.get(label))
}

// --- encode ---------------------------------------------------------------

/** Unsigned LEB128, the bytes a varint-coded list is made of. */
function varints(values) {
  const bytes = []
  for (let value of values) {
    while (value >= 0x80) {
      bytes.push((value & 0x7f) | 0x80)
      value = Math.floor(value / 128)
    }
    bytes.push(value)
  }
  return Buffer.from(bytes).toString('base64')
}

const hashes = [...book.keys()].sort((a, b) => a - b)
const deltas = hashes.map((hash, index) => hash - (index === 0 ? 0 : hashes[index - 1]))
// 0 for a position no line ends on, else the label's index plus one.
const named = hashes.map((hash) => book.get(hash) + 1)

const source = `/**
 * The opening book: every position of the Lichess opening table
 * (github.com/lichess-org/chess-openings, CC0, commit ${COMMIT.slice(0, 7)}), named
 * in French.
 *
 * GENERATED by scripts/build-openings.mjs — do not edit by hand. The French
 * names live in scripts/lib/openings-fr.mjs.
 */

/** ECO code and French name, each a label a book position can point to. */
export const OPENING_LABELS: readonly (readonly [eco: string, name: string])[] = ${JSON.stringify(
  labels.map((label) => label.split('\t')),
)}

/** The book's position hashes, sorted, as base64 varint deltas. */
export const BOOK_HASHES = ${JSON.stringify(varints(deltas))}

/** For each hash in that order: 0 if no line ends there, else its label's index + 1. */
export const BOOK_LABELS = ${JSON.stringify(varints(named))}
`

const config = (await prettier.resolveConfig(OUT)) ?? {}
await writeFile(OUT, await prettier.format(source, { ...config, parser: 'typescript' }))

process.stderr.write(
  `${rows.length} lines, ${hashes.length} book positions, ` +
    `${named.filter((value) => value > 0).length} named, ${labels.length} labels, ` +
    `${duplicates} positions ending two lines (first kept)\n`,
)
