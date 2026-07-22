import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  championMoves,
  chooseEnemyMove,
  isInDanger,
  respawnSquare,
  spawnSquareFor,
  threateningEnemies,
  type ChampionType,
  type EnemyType,
} from '@/features/hunt/board'
import {
  CAPTURE_PENALTY_MS,
  DANGER_GRACE_MS,
  RESPAWN_DELAY_MS,
  ROUND_MS,
  STARTING_LIVES,
  capturePoints,
  nextCombo,
} from '@/features/hunt/scoring'

export type HuntPhase = 'setup' | 'playing' | 'over'

const ENEMY_TYPES: EnemyType[] = ['p', 'n', 'b', 'r', 'q']
/** The board always holds at least this many enemies, so there is always prey. */
const MIN_ENEMIES = 3
const MAX_ENEMIES = 7
/** A new enemy appears on this cadence, on top of the minimum. */
const SPAWN_INTERVAL_MS = 3_500
/** One enemy moves on this cadence, so the board closes in on the champion. */
const ENEMY_MOVE_INTERVAL_MS = 1_400
const TICK_MS = 100

interface HuntInternals {
  champion: ChampionType
  championSquare: string
  enemies: Map<string, EnemyType>
  timeLeftMs: number
  lives: number
  score: number
  captures: number
  combo: number
  lastCaptureAt: number
  /** When the champion first came under threat, or null. */
  dangerSince: number | null
  /** While set, the champion has been eaten and is waiting to reappear. */
  respawnAt: number | null
  nextSpawnAt: number
  nextEnemyMoveAt: number
  lastTick: number
  /**
   * Bumped on every change to `enemies`. The map is mutated in place, so its
   * reference never changes and memos downstream would keep a stale board.
   */
  enemiesVersion: number
}

export interface HuntGame {
  phase: HuntPhase
  champion: ChampionType | null
  /** Null while the champion has been eaten and has not reappeared yet. */
  championSquare: string | null
  enemies: ReadonlyMap<string, EnemyType>
  timeLeftMs: number
  lives: number
  score: number
  captures: number
  combo: number
  /** Enemies currently able to take the champion. */
  threats: string[]
  /** True during the pause between being eaten and reappearing. */
  isRespawning: boolean
  moves: string[]
  start: (champion: ChampionType) => void
  moveTo: (square: string) => boolean
  reset: () => void
}

function emptyInternals(): HuntInternals {
  return {
    champion: 'n',
    championSquare: 'd4',
    enemies: new Map(),
    timeLeftMs: ROUND_MS,
    lives: STARTING_LIVES,
    score: 0,
    captures: 0,
    combo: 0,
    lastCaptureAt: 0,
    dangerSince: null,
    respawnAt: null,
    nextSpawnAt: 0,
    nextEnemyMoveAt: 0,
    lastTick: 0,
    enemiesVersion: 0,
  }
}

/** Adds an enemy on a square that is not an immediate ambush. */
function spawnEnemy(state: HuntInternals): void {
  if (state.enemies.size >= MAX_ENEMIES) return
  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]!
  const square = spawnSquareFor(type, state.enemies, state.championSquare)
  if (square) {
    state.enemies.set(square, type)
    state.enemiesVersion += 1
  }
}

/** Refills the board so the champion never runs out of prey. */
function ensureMinimumEnemies(state: HuntInternals): void {
  let guard = 0
  while (state.enemies.size < MIN_ENEMIES && guard < 20) {
    const before = state.enemies.size
    spawnEnemy(state)
    if (state.enemies.size === before) break
    guard += 1
  }
}

/** Moves a single enemy, which is what turns a static board into a hunt. */
function moveOneEnemy(state: HuntInternals): void {
  const squares = [...state.enemies.keys()]
  if (squares.length === 0) return

  const from = squares[Math.floor(Math.random() * squares.length)]!
  const piece = state.enemies.get(from)
  if (!piece) return

  // While the champion is off the board there is nobody to hunt.
  const champion = state.respawnAt === null ? state.championSquare : null
  const to = chooseEnemyMove(from, state.enemies, champion)
  if (!to) return

  state.enemies.delete(from)
  state.enemies.set(to, piece)
  state.enemiesVersion += 1
}

/**
 * The arcade round of section 2.4: capture as much as possible in sixty
 * seconds, three lives, combo multiplier, enemies appearing over time.
 *
 * The round lives in a ref driven by one interval rather than in many pieces of
 * state: a game loop reading stale state between ticks is the classic way for
 * an arcade timer to drift or stall.
 */
export function useHuntGame(): HuntGame {
  const state = useRef<HuntInternals>(emptyInternals())
  // Phase is real state, not a ref: the round loop is an effect, and an effect
  // cannot react to a ref changing.
  const [phase, setPhase] = useState<HuntPhase>('setup')
  const phaseRef = useRef<HuntPhase>('setup')
  const [, render] = useReducer((tick: number) => tick + 1, 0)

  const enterPhase = useCallback((next: HuntPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const start = useCallback(
    (champion: ChampionType) => {
      const now = Date.now()
      const fresh = emptyInternals()
      fresh.champion = champion
      fresh.championSquare = 'd4'
      fresh.lastTick = now
      fresh.nextSpawnAt = now + SPAWN_INTERVAL_MS
      fresh.nextEnemyMoveAt = now + ENEMY_MOVE_INTERVAL_MS
      ensureMinimumEnemies(fresh)
      state.current = fresh
      enterPhase('playing')
      render()
    },
    [enterPhase, render],
  )

  const reset = useCallback(() => {
    state.current = emptyInternals()
    enterPhase('setup')
    render()
  }, [enterPhase, render])

  /**
   * The champion is taken: the enemy that was threatening it moves onto its
   * square — it eats it — and the champion only reappears after a short pause,
   * costing a life and five seconds.
   */
  const loseLife = useCallback(
    (now: number) => {
      const current = state.current

      const attacker = threateningEnemies(current.championSquare, current.enemies)[0]
      if (attacker) {
        const type = current.enemies.get(attacker)
        if (type) {
          current.enemies.delete(attacker)
          current.enemies.set(current.championSquare, type)
          current.enemiesVersion += 1
        }
      }

      current.lives -= 1
      current.combo = 0
      current.dangerSince = null
      current.timeLeftMs = Math.max(0, current.timeLeftMs - CAPTURE_PENALTY_MS)
      current.respawnAt = now + RESPAWN_DELAY_MS
      if (current.lives <= 0) enterPhase('over')
    },
    [enterPhase],
  )

  const moveTo = useCallback(
    (square: string) => {
      const current = state.current
      if (phaseRef.current !== 'playing' || current.respawnAt !== null) return false
      if (
        !championMoves(current.champion, current.championSquare, current.enemies).includes(square)
      )
        return false

      const now = Date.now()
      const captured = current.enemies.get(square)
      if (captured) {
        current.enemies.delete(square)
        current.enemiesVersion += 1
        current.combo = nextCombo(current.combo, now - current.lastCaptureAt)
        current.lastCaptureAt = now
        current.captures += 1
        current.score += capturePoints(captured, current.combo)
        ensureMinimumEnemies(current)
      }

      current.championSquare = square
      // Moving out of danger clears the countdown; moving into it restarts one.
      current.dangerSince = isInDanger(square, current.enemies) ? now : null
      render()
      return true
    },
    [render],
  )

  useEffect(() => {
    if (phase !== 'playing') return

    const id = setInterval(() => {
      const current = state.current
      if (phaseRef.current !== 'playing') return

      const now = Date.now()
      const elapsed = now - current.lastTick
      current.lastTick = now
      current.timeLeftMs = Math.max(0, current.timeLeftMs - elapsed)

      if (now >= current.nextSpawnAt) {
        spawnEnemy(current)
        current.nextSpawnAt = now + SPAWN_INTERVAL_MS
      }
      if (now >= current.nextEnemyMoveAt) {
        moveOneEnemy(current)
        current.nextEnemyMoveAt = now + ENEMY_MOVE_INTERVAL_MS
      }
      ensureMinimumEnemies(current)

      if (current.respawnAt !== null) {
        // Eaten: reappear on a safe square once the pause is over.
        if (now >= current.respawnAt) {
          const square = respawnSquare(current.enemies)
          if (square) current.championSquare = square
          current.respawnAt = null
        }
      } else {
        // Danger: the champion must step away before the grace period runs out.
        const inDanger = isInDanger(current.championSquare, current.enemies)
        if (!inDanger) current.dangerSince = null
        else if (current.dangerSince === null) current.dangerSince = now
        else if (now - current.dangerSince >= DANGER_GRACE_MS) loseLife(now)
      }

      if (current.timeLeftMs <= 0) enterPhase('over')
      render()
    }, TICK_MS)

    return () => clearInterval(id)
  }, [phase, loseLife, enterPhase, render])

  const current = state.current
  // A fresh map whenever the enemies changed, so consumers' memos see it.
  const enemiesSnapshot = useMemo(
    () => new Map(current.enemies),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current.enemiesVersion],
  )
  const isRespawning = current.respawnAt !== null
  const isPlaying = phase === 'playing' && !isRespawning

  return {
    phase,
    champion: phase === 'setup' ? null : current.champion,
    championSquare: isRespawning ? null : current.championSquare,
    enemies: enemiesSnapshot,
    timeLeftMs: current.timeLeftMs,
    lives: current.lives,
    score: current.score,
    captures: current.captures,
    combo: current.combo,
    threats: isPlaying ? threateningEnemies(current.championSquare, current.enemies) : [],
    isRespawning,
    moves: isPlaying
      ? championMoves(current.champion, current.championSquare, current.enemies)
      : [],
    start,
    moveTo,
    reset,
  }
}
