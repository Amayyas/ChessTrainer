import { useEffect, useRef } from 'react'
import { rowToSnapshot, snapshotKey, snapshotToRow } from '@/features/progression/sync'
import { type ProgressionRow, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { type ProgressionSnapshot, useProgressionStore } from '@/store/useProgressionStore'

/** Debounce so a burst of gains in one session becomes a single write. */
const WRITE_DELAY_MS = 1_000
/** A pull that fails is retried a few times before the session gives up. */
const MAX_PULL_ATTEMPTS = 4
const PULL_RETRY_MS = 500

function currentSnapshot(): ProgressionSnapshot {
  const { xp, stats, unlockedBadges } = useProgressionStore.getState()
  return { xp, stats, unlockedBadges }
}

/**
 * Mirrors the progression store to Supabase for a signed-in account, so XP,
 * badges and statistics follow the player across devices (specification
 * deliverable 5).
 *
 * On sign-in it pulls the account's row; the first time an account has none, it
 * seeds one from whatever the player built as a guest, so that progress is kept
 * rather than dropped. After that the server is the source of truth: a later
 * sign-in — on any device — replaces the local copy. While signed in, every
 * change is written back, debounced into one request.
 *
 * A write sends the whole snapshot, so it must never send a stale one. Two
 * guards ensure that: writes stay disabled until the baseline row has actually
 * been read (a failed pull is retried, never assumed empty), and at most one
 * upsert is ever in flight, with a re-run that always reads the latest state —
 * so the server converges on the newest snapshot and an older one cannot land
 * last. Two devices playing at the very same second still resolve last-write-
 * wins on the whole row, which is the same trade-off as "server is the source
 * of truth on sign-in" and does not warrant per-field version vectors here.
 */
export function useProgressionSync(): void {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id ?? null

  // The last snapshot known to match the server, so an unchanged store — most
  // notably the pull's own hydrate — is never written straight back.
  const syncedKey = useRef<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client || !userId) {
      syncedKey.current = null
      return
    }

    let active = true
    // Writes wait for the baseline, so a local change can never land on the
    // server before we know whether the account already has a row.
    let ready = false
    let timer: ReturnType<typeof setTimeout> | undefined

    // Serialise writes: one upsert in flight at a time, and if the store moved
    // while it ran, loop once more reading the store afresh. The server then
    // always ends on the newest snapshot, never an older one that finished late.
    let writing = false
    let writeAgain = false

    const write = async () => {
      if (writing) {
        writeAgain = true
        return
      }
      writing = true
      try {
        do {
          writeAgain = false
          const snapshot = currentSnapshot()
          const key = snapshotKey(snapshot)
          if (key === syncedKey.current) break
          const { error } = await client
            .from('progression')
            .upsert(snapshotToRow(userId, snapshot), { onConflict: 'user_id' })
          if (!active) return
          // On failure the key is left as is, so the next change retries.
          if (error) break
          syncedKey.current = key
        } while (writeAgain)
      } finally {
        writing = false
      }
    }

    const scheduleWrite = () => {
      if (!active || !ready) return
      clearTimeout(timer)
      timer = setTimeout(() => void write(), WRITE_DELAY_MS)
    }

    // Pull, with a bounded retry: writes stay blocked until the row is read
    // (hydrate) or confirmed absent (seed). A failed pull must never enable
    // writes, or an unhydrated local snapshot could overwrite the server row.
    let attempt = 0
    const pull = async () => {
      // The first request after sign-in can outrun the token; awaiting the
      // session first makes sure it is attached.
      await client.auth.getSession()
      const { data, error } = await client
        .from('progression')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (!active) return

      if (error) {
        attempt += 1
        // Give up after a few tries and stay read-only, which is safe — the
        // next sign-in tries again — rather than risk overwriting the server.
        if (attempt >= MAX_PULL_ATTEMPTS) return
        timer = setTimeout(() => void pull(), PULL_RETRY_MS * attempt)
        return
      }

      if (data) {
        const snapshot = rowToSnapshot(data as ProgressionRow)
        useProgressionStore.getState().hydrate(snapshot)
        syncedKey.current = snapshotKey(snapshot)
      } else {
        // Genuinely no row: seed it from the current (guest) progress below.
        syncedKey.current = null
      }
      ready = true
      // Flush now: a seed to send, or any change made while the pull was in
      // flight. After a hydrate this is a no-op, since the store matches.
      void write()
    }
    void pull()

    const unsubscribe = useProgressionStore.subscribe(scheduleWrite)

    return () => {
      active = false
      clearTimeout(timer)
      unsubscribe()
    }
  }, [userId])
}
