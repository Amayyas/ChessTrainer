import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  championMoves,
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
  ROUND_MS,
  STARTING_LIVES,
  capturePoints,
  nextCombo,
} from '@/features/hunt/scoring'

export type HuntPhase = 'setup' | 'playing' | 'over'

const ENEMY_TYPES: EnemyType[] = ['p', 'n', 'b', 'r', 'q']
const INITIAL_ENEMIES = 3
const MAX_ENEMIES = 7
/** A new enemy appears on this cadence, to keep the pressure up. */
const SPAWN_INTERVAL_MS = 3_500
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
  nextSpawnAt: number
  lastTick: number
}

export interface HuntGame {
  phase: HuntPhase
  champion: ChampionType | null
  championSquare: string
  enemies: ReadonlyMap<string, EnemyType>
  timeLeftMs: number
  lives: number
  score: number
  captures: number
  combo: number
  /** Enemies currently able to take the champion. */
  threats: string[]
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
    nextSpawnAt: 0,
    lastTick: 0,
  }
}

/** Adds an enemy on a square that is not an immediate ambush. */
function spawnEnemy(state: HuntInternals): void {
  if (state.enemies.size >= MAX_ENEMIES) return
  const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)]!
  const square = spawnSquareFor(type, state.enemies, state.championSquare)
  if (square) state.enemies.set(square, type)
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
  const phase = useRef<HuntPhase>('setup')
  const [, render] = useReducer((tick: number) => tick + 1, 0)

  const start = useCallback(
    (champion: ChampionType) => {
      const now = Date.now()
      const fresh = emptyInternals()
      fresh.champion = champion
      fresh.championSquare = 'd4'
      fresh.lastTick = now
      fresh.nextSpawnAt = now + SPAWN_INTERVAL_MS
      for (let i = 0; i < INITIAL_ENEMIES; i += 1) spawnEnemy(fresh)
      state.current = fresh
      phase.current = 'playing'
      render()
    },
    [render],
  )

  const reset = useCallback(() => {
    state.current = emptyInternals()
    phase.current = 'setup'
    render()
  }, [render])

  /** Takes a life, pushes the champion to safety and costs five seconds. */
  const loseLife = useCallback((now: number) => {
    const current = state.current
    current.lives -= 1
    current.combo = 0
    current.dangerSince = null
    current.timeLeftMs = Math.max(0, current.timeLeftMs - CAPTURE_PENALTY_MS)
    const square = respawnSquare(current.enemies)
    if (square) current.championSquare = square
    if (current.lives <= 0) phase.current = 'over'
    void now
  }, [])

  const moveTo = useCallback(
    (square: string) => {
      const current = state.current
      if (phase.current !== 'playing') return false
      if (
        !championMoves(current.champion, current.championSquare, current.enemies).includes(square)
      )
        return false

      const now = Date.now()
      const captured = current.enemies.get(square)
      if (captured) {
        current.enemies.delete(square)
        current.combo = nextCombo(current.combo, now - current.lastCaptureAt)
        current.lastCaptureAt = now
        current.captures += 1
        current.score += capturePoints(captured, current.combo)
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
    if (phase.current !== 'playing') return

    const id = setInterval(() => {
      const current = state.current
      if (phase.current !== 'playing') return

      const now = Date.now()
      const elapsed = now - current.lastTick
      current.lastTick = now
      current.timeLeftMs = Math.max(0, current.timeLeftMs - elapsed)

      if (now >= current.nextSpawnAt) {
        spawnEnemy(current)
        current.nextSpawnAt = now + SPAWN_INTERVAL_MS
      }

      // Danger: the champion must step away before the grace period runs out.
      const inDanger = isInDanger(current.championSquare, current.enemies)
      if (!inDanger) current.dangerSince = null
      else {
        if (current.dangerSince === null) current.dangerSince = now
        else if (now - current.dangerSince >= DANGER_GRACE_MS) loseLife(now)
      }

      if (current.timeLeftMs <= 0) phase.current = 'over'
      render()
    }, TICK_MS)

    return () => clearInterval(id)
    // `render` and `loseLife` are stable; the loop restarts only on phase changes.
  }, [loseLife, render, phase.current])

  const current = state.current
  const isPlaying = phase.current === 'playing'

  return {
    phase: phase.current,
    champion: phase.current === 'setup' ? null : current.champion,
    championSquare: current.championSquare,
    enemies: current.enemies,
    timeLeftMs: current.timeLeftMs,
    lives: current.lives,
    score: current.score,
    captures: current.captures,
    combo: current.combo,
    threats: isPlaying ? threateningEnemies(current.championSquare, current.enemies) : [],
    moves: isPlaying
      ? championMoves(current.champion, current.championSquare, current.enemies)
      : [],
    start,
    moveTo,
    reset,
  }
}
