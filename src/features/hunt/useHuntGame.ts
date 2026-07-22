import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
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
  RESPAWN_DELAY_MS,
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
  /** While set, the champion has been eaten and is waiting to reappear. */
  respawnAt: number | null
  nextSpawnAt: number
  lastTick: number
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
      for (let i = 0; i < INITIAL_ENEMIES; i += 1) spawnEnemy(fresh)
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
  const isRespawning = current.respawnAt !== null
  const isPlaying = phase === 'playing' && !isRespawning

  return {
    phase,
    champion: phase === 'setup' ? null : current.champion,
    championSquare: isRespawning ? null : current.championSquare,
    enemies: current.enemies,
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
