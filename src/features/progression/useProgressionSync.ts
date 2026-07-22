import { useEffect, useRef } from 'react'
import { rowToSnapshot, snapshotKey, snapshotToRow } from '@/features/progression/sync'
import { type ProgressionRow, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { type ProgressionSnapshot, useProgressionStore } from '@/store/useProgressionStore'

/** Debounce so a burst of gains in one session becomes a single write. */
const WRITE_DELAY_MS = 1_000

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
    // Writes wait for the pull, so a local change during it cannot upset the
    // seed-or-hydrate decision by landing on the server first.
    let ready = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const write = async () => {
      const snapshot = currentSnapshot()
      const key = snapshotKey(snapshot)
      if (key === syncedKey.current) return
      const { error } = await client
        .from('progression')
        .upsert(snapshotToRow(userId, snapshot), { onConflict: 'user_id' })
      // On failure the key is left as is, so the next change retries the write.
      if (!error) syncedKey.current = key
    }

    // Pull first, then start following local changes, so the seed-or-hydrate
    // decision is made before any write can race it.
    void (async () => {
      // Make sure the client has the freshly signed-in token attached before
      // the request, otherwise the very first call can race it and be rejected.
      await client.auth.getSession()
      const { data, error } = await client
        .from('progression')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (!active) return

      if (error) {
        // A failed pull is *not* proof the account has no row. Seeding here
        // would overwrite a real server copy with the empty local one, so the
        // only safe move is to leave the server untouched; a later genuine
        // change still upserts, which merges rather than replaces.
        ready = true
        return
      }

      if (data) {
        const snapshot = rowToSnapshot(data as ProgressionRow)
        useProgressionStore.getState().hydrate(snapshot)
        syncedKey.current = snapshotKey(snapshot)
      } else {
        // The query succeeded and there is genuinely no row: seed the account
        // from the current (guest) progress so it is kept rather than dropped.
        syncedKey.current = null
        await write()
      }
      ready = true
    })()

    const unsubscribe = useProgressionStore.subscribe(() => {
      if (!active || !ready) return
      clearTimeout(timer)
      timer = setTimeout(() => void write(), WRITE_DELAY_MS)
    })

    return () => {
      active = false
      clearTimeout(timer)
      unsubscribe()
    }
  }, [userId])
}
