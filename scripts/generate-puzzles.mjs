/**
 * Offline puzzle generator (spec module M6).
 *
 * The specification imports puzzles from the Lichess Open Database, which is
 * hundreds of megabytes and cannot be bundled; its own risk section allows a
 * hardcoded set instead. Rather than hand-writing tactics — the reliable way to
 * end up with "solved but marked wrong" — this script lets Stockfish find and
 * verify them, so a puzzle's solution *is* the engine's own best line.
 *
 * Positions come from plausible games (shallow engine play) with occasional
 * random blunders injected, which is how tactics arise in real play. Each
 * position is then screened with MultiPV=2: it becomes a puzzle only when the
 * best move is decisively better than the second best.
 *
 * Usage: start `npm run dev`, then
 *   node scripts/generate-puzzles.mjs > src/features/puzzle/puzzles.ts
 */
import { Chess } from 'chess.js'
import puppeteer from 'puppeteer-core'

const CHROME = '/usr/bin/google-chrome'
const APP_URL = 'http://localhost:5173/'
const TARGET_PUZZLES = 24
const SCREEN_DEPTH = 14
const GAME_DEPTH = 5
/** Chance of playing a random legal move instead of the engine's choice. */
const BLUNDER_RATE = 0.22
const MIN_GAP = 250
/** Above this the position is already won and the tactic is not the point. */
const MAX_SECOND_BEST = 250

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await browser.newPage()
await page.goto(APP_URL, { waitUntil: 'networkidle2' })

await page.evaluate(
  () =>
    new Promise((resolve) => {
      window.__sf = new Worker('/stockfish/stockfish.js')
      window.__cb = null
      window.__sf.onmessage = (event) => window.__cb?.('' + event.data)
      window.__cb = (line) => {
        if (/uciok/.test(line)) window.__sf.postMessage('isready')
        else if (/readyok/.test(line)) {
          window.__cb = null
          resolve()
        }
      }
      window.__sf.postMessage('uci')
    }),
)

/** Full-strength search returning the best line, and the second best when asked. */
async function search(fen, depth, multipv) {
  return page.evaluate(
    (fen, depth, multipv) =>
      new Promise((resolve) => {
        const lines = new Map()
        window.__cb = (line) => {
          const pv = line.match(/multipv (\d+)/)
          const score = line.match(/score (cp|mate) (-?\d+)/)
          const moves = line.match(/ pv (.+)$/)
          if (line.startsWith('info') && score) {
            const index = pv ? Number(pv[1]) : 1
            lines.set(index, {
              type: score[1],
              value: Number(score[2]),
              pv: moves ? moves[1].split(' ') : [],
            })
          }
          const best = line.match(/^bestmove (\S+)/)
          if (best) {
            window.__cb = null
            resolve({ best: best[1], first: lines.get(1) ?? null, second: lines.get(2) ?? null })
          }
        }
        window.__sf.postMessage('setoption name MultiPV value ' + multipv)
        window.__sf.postMessage('position fen ' + fen)
        window.__sf.postMessage('go depth ' + depth)
      }),
    fen,
    depth,
    multipv,
  )
}

function toCp(line) {
  if (!line) return null
  if (line.type === 'mate') {
    return line.value > 0 ? 100000 - line.value * 100 : -100000 - line.value * 100
  }
  return line.value
}

/**
 * True when the piece that just moved attacks two valuable targets, or gives
 * check while attacking one. The side to move is flipped on a probe board,
 * because after the move it is the opponent's turn and chess.js would otherwise
 * list *their* moves instead of the moved piece's attacks.
 */
function isFork(fenAfter, toSquare, moverColor) {
  const givesCheck = new Chess(fenAfter).isCheck()

  const parts = fenAfter.split(' ')
  parts[1] = moverColor
  parts[3] = '-'
  let probe
  try {
    probe = new Chess(parts.join(' '))
  } catch {
    return givesCheck
  }

  const piece = probe.get(toSquare)
  if (!piece || piece.color !== moverColor) return false

  let targets = 0
  for (const move of probe.moves({ verbose: true, square: toSquare })) {
    const victim = probe.get(move.to)
    if (victim && victim.color !== moverColor && PIECE_VALUE[victim.type] >= 3) targets += 1
  }
  return targets >= 2 || (givesCheck && targets >= 1)
}

function classify(mateIn, gap, fenAfterFirst, toSquare, moverColor) {
  if (mateIn !== null) {
    return { theme: `mat-en-${mateIn}`, rating: mateIn <= 1 ? 900 : mateIn === 2 ? 1400 : 1900 }
  }
  if (isFork(fenAfterFirst, toSquare, moverColor)) {
    return { theme: 'fourchette', rating: gap >= 600 ? 1300 : 1500 }
  }
  return { theme: 'gain-materiel', rating: gap >= 900 ? 1100 : gap >= 500 ? 1500 : 1700 }
}

/** A plausible game: shallow engine moves with the odd random blunder. */
async function playGame(maxPlies) {
  const chess = new Chess()
  const positions = []
  for (let ply = 0; ply < maxPlies && !chess.isGameOver(); ply += 1) {
    positions.push(chess.fen())
    const legal = chess.moves({ verbose: true })
    let chosen
    if (Math.random() < BLUNDER_RATE) {
      chosen = legal[Math.floor(Math.random() * legal.length)]
    } else {
      const { best } = await search(chess.fen(), GAME_DEPTH, 1)
      chosen =
        legal.find((move) => move.from + move.to + (move.promotion ?? '') === best) ?? legal[0]
    }
    chess.move(chosen)
  }
  return positions
}

/** A random sparse endgame with White to move, or null if it is not legal. */
function randomEndgame() {
  const taken = new Set()
  const place = () => {
    for (;;) {
      const file = Math.floor(Math.random() * 8)
      const rank = Math.floor(Math.random() * 8)
      const key = file + ',' + rank
      if (!taken.has(key)) {
        taken.add(key)
        return { file, rank }
      }
    }
  }

  const board = Array.from({ length: 8 }, () => Array(8).fill(null))
  const put = (piece) => {
    const { file, rank } = place()
    board[rank][file] = piece
  }

  put('K')
  put('k')
  const attackers = ['Q', 'R', 'R', 'B', 'N'][Math.floor(Math.random() * 5)]
  put(attackers)
  if (Math.random() < 0.6) put(['Q', 'R', 'B', 'N'][Math.floor(Math.random() * 4)])
  if (Math.random() < 0.4) put(['r', 'b', 'n', 'p'][Math.floor(Math.random() * 4)])

  const rows = []
  for (let rank = 7; rank >= 0; rank -= 1) {
    let row = ''
    let empty = 0
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank][file]
      if (piece) {
        if (empty) row += empty
        empty = 0
        row += piece
      } else empty += 1
    }
    if (empty) row += empty
    rows.push(row)
  }
  const fen = `${rows.join('/')} w - - 0 1`

  try {
    const chess = new Chess(fen)
    // Illegal if Black is already in check while it is White's move.
    const flipped = new Chess(fen.replace(' w ', ' b '))
    if (flipped.isCheck()) return null
    if (chess.isGameOver() || chess.moves().length === 0) return null
    return fen
  } catch {
    return null
  }
}

/** Moves that mate at once. */
function mateInOneMoves(fen) {
  const chess = new Chess(fen)
  const mates = []
  for (const move of chess.moves()) {
    chess.move(move)
    if (chess.isCheckmate()) mates.push(move)
    chess.undo()
  }
  return mates
}

/** Moves that force mate in two against every defence. */
function mateInTwoMoves(fen) {
  const chess = new Chess(fen)
  const forcing = []
  for (const first of chess.moves()) {
    chess.move(first)
    if (chess.isCheckmate()) {
      chess.undo()
      continue
    }
    let forced = !chess.isStalemate() && !chess.isDraw()
    if (forced) {
      for (const reply of chess.moves()) {
        chess.move(reply)
        const mates = chess.moves().some((finish) => {
          chess.move(finish)
          const isMate = chess.isCheckmate()
          chess.undo()
          return isMate
        })
        chess.undo()
        if (!mates) {
          forced = false
          break
        }
      }
    }
    chess.undo()
    if (forced) forcing.push(first)
  }
  return forcing
}

/** Converts a SAN move to UCI on the given position. */
function sanToUci(fen, san) {
  const chess = new Chess(fen)
  const move = chess.move(san)
  return move.from + move.to + (move.promotion ?? '')
}

/** Builds the full forced-mate line for a mate-in-two, playing the best defence. */
function mateInTwoLine(fen, firstSan) {
  const chess = new Chess(fen)
  chess.move(firstSan)
  const reply = chess.moves()[0]
  chess.move(reply)
  const finish = chess.moves().find((move) => {
    chess.move(move)
    const isMate = chess.isCheckmate()
    chess.undo()
    return isMate
  })
  const line = new Chess(fen)
  const uci = []
  for (const san of [firstSan, reply, finish]) {
    const move = line.move(san)
    uci.push(move.from + move.to + (move.promotion ?? ''))
  }
  return uci
}

const puzzles = []
const seenFens = new Set()
let games = 0

// Mate puzzles: exhaustively verified with chess.js, and kept only when a single
// move works, so the promise of one right answer holds.
const MATE_TARGET = 8
let endgameTries = 0
while (puzzles.length < MATE_TARGET && endgameTries < 40000) {
  endgameTries += 1
  const fen = randomEndgame()
  if (!fen || seenFens.has(fen)) continue
  seenFens.add(fen)

  const inOne = mateInOneMoves(fen)
  if (inOne.length === 1) {
    puzzles.push({
      id: '',
      fen,
      solution: [sanToUci(fen, inOne[0])],
      theme: 'mat-en-1',
      rating: 900,
      sideToMove: 'w',
    })
    process.stderr.write(`  mat en 1 (${puzzles.length})\n`)
    continue
  }
  if (inOne.length > 0) continue

  const inTwo = mateInTwoMoves(fen)
  if (inTwo.length === 1) {
    puzzles.push({
      id: '',
      fen,
      solution: mateInTwoLine(fen, inTwo[0]),
      theme: 'mat-en-2',
      rating: 1400,
      sideToMove: 'w',
    })
    process.stderr.write(`  mat en 2 (${puzzles.length})\n`)
  }
}

while (puzzles.length < TARGET_PUZZLES && games < 40) {
  games += 1
  const positions = await playGame(14 + Math.floor(Math.random() * 20))

  for (const fen of positions) {
    if (puzzles.length >= TARGET_PUZZLES) break
    if (seenFens.has(fen)) continue
    seenFens.add(fen)

    const board = new Chess(fen)
    if (board.isGameOver() || board.moves().length < 4) continue

    const { first, second } = await search(fen, SCREEN_DEPTH, 2)
    if (!first || !second || first.pv.length === 0) continue

    const bestCp = toCp(first)
    const secondCp = toCp(second)
    const mateIn = first.type === 'mate' && first.value > 0 ? first.value : null
    const gap = bestCp - secondCp

    if (mateIn !== null) {
      // Only the forced mate must work: a second mate of the same length would
      // make the "one right answer" promise false.
      if (second.type === 'mate' && second.value > 0 && second.value <= mateIn) continue
    } else {
      if (gap < MIN_GAP) continue
      // Without the key move the position stays balanced, so the tactic matters.
      if (Math.abs(secondCp) > MAX_SECOND_BEST) continue
    }

    const plies = mateIn !== null ? mateIn * 2 - 1 : Math.min(3, first.pv.length)
    const solution = first.pv.slice(0, plies)
    if (solution.length === 0) continue

    const replay = new Chess(fen)
    let legal = true
    let fenAfterFirst = null
    for (const [index, uci] of solution.entries()) {
      try {
        replay.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
        if (index === 0) fenAfterFirst = replay.fen()
      } catch {
        legal = false
        break
      }
    }
    if (!legal || !fenAfterFirst) continue
    if (mateIn !== null && !replay.isCheckmate()) continue

    const { theme, rating } = classify(
      mateIn,
      gap,
      fenAfterFirst,
      solution[0].slice(2, 4),
      board.turn(),
    )
    puzzles.push({ id: '', fen, solution, theme, rating, sideToMove: board.turn() })
    process.stderr.write(`  ${puzzles.length}/${TARGET_PUZZLES} ${theme} (${rating})\n`)
  }
}

await browser.close()

// Easiest first, then a stable id per puzzle.
puzzles.sort((a, b) => a.rating - b.rating)
puzzles.forEach((puzzle, index) => {
  puzzle.id = `ct-${String(index + 1).padStart(3, '0')}`
})

const header = `/**
 * Tactical puzzles for module M6.
 *
 * Generated and verified by scripts/generate-puzzles.mjs: every solution is
 * Stockfish's own best line, kept only when it is decisively better than the
 * second-best move, so a correct answer can never be marked wrong. The
 * specification's Lichess import is replaced by this bundled set, the fallback
 * its own risk section allows.
 *
 * DO NOT EDIT BY HAND — regenerate with the script.
 */
import type { Puzzle } from '@/features/puzzle/types'

export const PUZZLES: readonly Puzzle[] = `

process.stdout.write(header + JSON.stringify(puzzles, null, 2) + '\n')
