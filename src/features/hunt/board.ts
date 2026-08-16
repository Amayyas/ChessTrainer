/**
 * Movement rules for the Piece Hunt arcade mode.
 *
 * chess.js cannot model this board: there are no kings, the piece sets are
 * arbitrary and the rules are not those of a chess game. These are small pure
 * functions instead, so the arcade logic stays testable on its own.
 */

export type ChampionType = 'q' | 'r' | 'b' | 'n'
export type EnemyType = 'p' | 'n' | 'b' | 'r' | 'q'
export type PieceType = ChampionType | EnemyType

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

/** file and rank are 0-based; rank 0 is rank "1" on the board. */
export function toSquare(file: number, rank: number): string {
  return `${FILES[file]}${rank + 1}`
}

export function fromSquare(square: string): { file: number; rank: number } {
  return { file: FILES.indexOf(square[0] as (typeof FILES)[number]), rank: Number(square[1]) - 1 }
}

export function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8
}

export const ALL_SQUARES: string[] = Array.from({ length: 64 }, (_, index) =>
  toSquare(index % 8, Math.floor(index / 8)),
)

const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const
const KNIGHT_STEPS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
] as const

/**
 * Squares a piece on `from` attacks. Sliders stop at the first occupied square
 * but still attack it, so a blocked square counts as covered.
 * Enemy pawns are black: they attack diagonally downwards.
 */
export function attackedSquares(
  piece: PieceType,
  from: string,
  occupied: ReadonlySet<string> = new Set(),
): string[] {
  const { file, rank } = fromSquare(from)
  const squares: string[] = []

  const ray = (directions: readonly (readonly [number, number])[]) => {
    for (const [df, dr] of directions) {
      let f = file + df
      let r = rank + dr
      while (isOnBoard(f, r)) {
        const square = toSquare(f, r)
        squares.push(square)
        if (occupied.has(square)) break
        f += df
        r += dr
      }
    }
  }

  const steps = (offsets: readonly (readonly [number, number])[]) => {
    for (const [df, dr] of offsets) {
      const f = file + df
      const r = rank + dr
      if (isOnBoard(f, r)) squares.push(toSquare(f, r))
    }
  }

  switch (piece) {
    case 'q':
      ray([...ROOK_DIRS, ...BISHOP_DIRS])
      break
    case 'r':
      ray(ROOK_DIRS)
      break
    case 'b':
      ray(BISHOP_DIRS)
      break
    case 'n':
      steps(KNIGHT_STEPS)
      break
    case 'p':
      steps([
        [-1, -1],
        [1, -1],
      ])
      break
  }
  return squares
}

/**
 * Empty squares a piece can *move* to. This is not the same as the squares it
 * attacks: a pawn attacks diagonally but advances straight, and this mode is
 * meant to teach how pieces move, so the difference matters.
 */
export function moveTargets(
  piece: PieceType,
  from: string,
  occupied: ReadonlySet<string> = new Set(),
): string[] {
  if (piece === 'p') {
    const { file, rank } = fromSquare(from)
    // Enemy pawns are black: they advance towards rank 1.
    if (!isOnBoard(file, rank - 1)) return []
    const ahead = toSquare(file, rank - 1)
    return occupied.has(ahead) ? [] : [ahead]
  }
  return attackedSquares(piece, from, occupied).filter((square) => !occupied.has(square))
}

export type EnemyBoard = ReadonlyMap<string, EnemyType>

/**
 * Where the champion may move: every square it attacks, whether empty or held
 * by an enemy — landing on an enemy captures it.
 */
export function championMoves(champion: ChampionType, from: string, enemies: EnemyBoard): string[] {
  const occupied = new Set(enemies.keys())
  return attackedSquares(champion, from, occupied)
}

/** Every square covered by at least one enemy, mapped to the enemies covering it. */
export function enemyCoverage(enemies: EnemyBoard, championSquare?: string): Map<string, string[]> {
  const occupied = new Set(enemies.keys())
  if (championSquare) occupied.add(championSquare)

  const coverage = new Map<string, string[]>()
  for (const [square, piece] of enemies) {
    for (const target of attackedSquares(piece, square, occupied)) {
      const attackers = coverage.get(target)
      if (attackers) attackers.push(square)
      else coverage.set(target, [square])
    }
  }
  return coverage
}

/** Enemies that could capture the champion where it stands. */
export function threateningEnemies(championSquare: string, enemies: EnemyBoard): string[] {
  return enemyCoverage(enemies, championSquare).get(championSquare) ?? []
}

export function isInDanger(championSquare: string, enemies: EnemyBoard): boolean {
  return threateningEnemies(championSquare, enemies).length > 0
}

/** Free squares no enemy covers — where the champion can safely respawn. */
export function safeSquares(enemies: EnemyBoard): string[] {
  const coverage = enemyCoverage(enemies)
  return ALL_SQUARES.filter((square) => !enemies.has(square) && !coverage.has(square))
}

export type Rng = () => number

function pick<T>(items: readonly T[], rng: Rng): T | null {
  if (items.length === 0) return null
  return items[Math.floor(rng() * items.length)] ?? null
}

/**
 * A square for a new enemy: free, not the champion's, and — as the mode
 * needs — not an immediate ambush, meaning the newcomer must not already
 * attack the champion.
 */
export function spawnSquareFor(
  piece: EnemyType,
  enemies: EnemyBoard,
  championSquare: string,
  rng: Rng = Math.random,
): string | null {
  const occupied = new Set(enemies.keys())
  occupied.add(championSquare)

  const candidates = ALL_SQUARES.filter((square) => {
    if (occupied.has(square)) return false
    const withNewcomer = new Set(occupied)
    withNewcomer.add(square)
    return !attackedSquares(piece, square, withNewcomer).includes(championSquare)
  })

  return pick(candidates, rng)
}

/**
 * Picks a move for one enemy. It never steps onto the champion: taking it is
 * the job of the danger countdown, which is what gives the player a chance to
 * escape. With `huntChance` it prefers a square that puts
 * the champion under threat, so the board closes in rather than milling about.
 */
export function chooseEnemyMove(
  from: string,
  enemies: EnemyBoard,
  championSquare: string | null,
  rng: Rng = Math.random,
  huntChance = 0.5,
): string | null {
  const piece = enemies.get(from)
  if (!piece) return null

  const occupied = new Set(enemies.keys())
  if (championSquare) occupied.add(championSquare)

  const targets = moveTargets(piece, from, occupied)
  if (targets.length === 0) return null

  if (championSquare && rng() < huntChance) {
    const hunting = targets.filter((target) => {
      const next = new Map(enemies)
      next.delete(from)
      next.set(target, piece)
      return isInDanger(championSquare, next)
    })
    if (hunting.length > 0) return pick(hunting, rng)
  }

  return pick(targets, rng)
}

/** A safe respawn square for the champion, preferring squares far from enemies. */
export function respawnSquare(enemies: EnemyBoard, rng: Rng = Math.random): string | null {
  const safe = safeSquares(enemies)
  if (safe.length === 0) {
    // Everything is covered: fall back to any free square.
    return pick(
      ALL_SQUARES.filter((square) => !enemies.has(square)),
      rng,
    )
  }
  return pick(safe, rng)
}

/** Points a captured enemy is worth, before the combo multiplier. */
export const CAPTURE_VALUE: Record<EnemyType, number> = { p: 10, n: 30, b: 30, r: 50, q: 90 }

export const CHAMPION_LABELS: Record<ChampionType, string> = {
  q: 'Dame',
  r: 'Tour',
  b: 'Fou',
  n: 'Cavalier',
}

/** Movement description shown on the champion picker. */
export const CHAMPION_DESCRIPTIONS: Record<ChampionType, string> = {
  q: 'Se déplace en ligne droite et en diagonale, sur toute la longueur du plateau.',
  r: 'Se déplace en ligne droite, horizontalement et verticalement.',
  b: 'Se déplace en diagonale, et reste donc sur ses cases de départ.',
  n: 'Saute en L : deux cases puis une, en passant par-dessus les autres pièces.',
}
