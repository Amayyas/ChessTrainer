import { useCallback, useEffect, useRef, useState } from 'react'
import type { Color } from '@/utils/chess'

export type TimeControlId = 'bullet' | 'blitz' | 'rapid' | 'unlimited'

export interface TimeControl {
  id: TimeControlId
  label: string
  /** Starting time per side, in ms. Zero means no clock. */
  initialMs: number
  /** Added to a player's clock after each of their moves, in ms. */
  incrementMs: number
}

/** The optional time controls of the specification (section 2.2). */
export const TIME_CONTROLS: readonly TimeControl[] = [
  { id: 'bullet', label: 'Bullet (1+0)', initialMs: 60_000, incrementMs: 0 },
  { id: 'blitz', label: 'Blitz (5+0)', initialMs: 300_000, incrementMs: 0 },
  { id: 'rapid', label: 'Rapide (10+5)', initialMs: 600_000, incrementMs: 5_000 },
  { id: 'unlimited', label: 'Sans limite', initialMs: 0, incrementMs: 0 },
]

export function getTimeControl(id: TimeControlId): TimeControl {
  return TIME_CONTROLS.find((control) => control.id === id) ?? TIME_CONTROLS[3]!
}

/** mm:ss, switching to tenths of a second under ten seconds. */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms)
  if (safe < 10_000) return (safe / 1000).toFixed(1)
  const totalSeconds = Math.ceil(safe / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export interface UseChessClock {
  enabled: boolean
  whiteMs: number
  blackMs: number
  /** Side whose clock is currently running, or null when stopped. */
  active: Color | null
  /** Side that ran out of time, or null. */
  flagged: Color | null
  start: (color: Color) => void
  stop: () => void
  reset: () => void
  /** Called after `mover` played: adds their increment and hands the clock over. */
  press: (mover: Color) => void
}

const TICK_MS = 100

/**
 * Two-sided chess clock with increment (spec section 2.2). Counts down from
 * real timestamps rather than tick counts, so it stays accurate if the tab
 * throttles the interval.
 */
export function useChessClock(control: TimeControl): UseChessClock {
  const enabled = control.initialMs > 0
  const [whiteMs, setWhiteMs] = useState(control.initialMs)
  const [blackMs, setBlackMs] = useState(control.initialMs)
  const [active, setActive] = useState<Color | null>(null)
  const [flagged, setFlagged] = useState<Color | null>(null)
  const lastTick = useRef(0)

  // Reset during render (not in an effect) when the time control changes.
  // An effect would leave one render where `enabled` is already true but the
  // clocks still hold the previous control's time — long enough for a clock
  // switched from "no limit" (0 ms) to raise a false flag.
  const [appliedControl, setAppliedControl] = useState(control)
  if (appliedControl !== control) {
    setAppliedControl(control)
    setWhiteMs(control.initialMs)
    setBlackMs(control.initialMs)
    setActive(null)
    setFlagged(null)
  }

  useEffect(() => {
    if (!enabled || !active || flagged) return

    lastTick.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastTick.current
      lastTick.current = now
      const tick = (ms: number) => Math.max(0, ms - elapsed)
      if (active === 'w') setWhiteMs(tick)
      else setBlackMs(tick)
    }, TICK_MS)

    return () => clearInterval(id)
  }, [enabled, active, flagged])

  // Raise the flag as soon as the *running* clock hits zero. Only the side to
  // move can lose on time, so a stopped clock never flags.
  useEffect(() => {
    if (!enabled || flagged || !active) return
    if (active === 'w' && whiteMs <= 0) {
      setFlagged('w')
      setActive(null)
    } else if (active === 'b' && blackMs <= 0) {
      setFlagged('b')
      setActive(null)
    }
  }, [whiteMs, blackMs, enabled, flagged, active])

  const start = useCallback(
    (color: Color) => {
      if (enabled) setActive(color)
    },
    [enabled],
  )

  const stop = useCallback(() => setActive(null), [])

  const reset = useCallback(() => {
    setWhiteMs(control.initialMs)
    setBlackMs(control.initialMs)
    setActive(null)
    setFlagged(null)
  }, [control.initialMs])

  const press = useCallback(
    (mover: Color) => {
      if (!enabled) return
      if (control.incrementMs > 0) {
        const add = (ms: number) => ms + control.incrementMs
        if (mover === 'w') setWhiteMs(add)
        else setBlackMs(add)
      }
      setActive(mover === 'w' ? 'b' : 'w')
    },
    [enabled, control.incrementMs],
  )

  return { enabled, whiteMs, blackMs, active, flagged, start, stop, reset, press }
}
