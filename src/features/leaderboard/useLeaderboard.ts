import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type LeaderboardPeriod = 'today' | 'week' | 'all'
/** 'all' shows the best score whatever the piece (spec section 2.6). */
export type LeaderboardPiece = 'all' | 'q' | 'r' | 'b' | 'n'

export interface LeaderboardRow {
  id: number
  userId: string
  username: string
  avatarPiece: string
  piece: string
  score: number
  captures: number
  playedAt: string
}

/** Oldest timestamp a period accepts, or null for all time. */
export function periodStart(period: LeaderboardPeriod, now: Date = new Date()): string | null {
  if (period === 'all') return null
  const start = new Date(now)
  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
  } else {
    // "This week" counts the last seven days, midnight-aligned.
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)
  }
  return start.toISOString()
}

/** Keeps only each player's best row, so one person cannot fill the table. */
export function bestPerPlayer(rows: LeaderboardRow[], limit = 10): LeaderboardRow[] {
  const best = new Map<string, LeaderboardRow>()
  for (const row of rows) {
    const current = best.get(row.userId)
    if (!current || row.score > current.score) best.set(row.userId, row)
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || b.captures - a.captures)
    .slice(0, limit)
}

interface ScoreWithProfile {
  id: number
  user_id: string
  piece: string
  score: number
  captures: number
  played_at: string
  profiles: { username: string; avatar_piece: string } | null
}

/**
 * The worldwide Piece Hunt leaderboard (spec section 2.6): top ten per piece or
 * overall, filtered by period, and refreshed live through Supabase Realtime.
 */
export function useLeaderboard(piece: LeaderboardPiece, period: LeaderboardPeriod) {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)

    let query = supabase
      .from('scores')
      .select('id, user_id, piece, score, captures, played_at, profiles(username, avatar_piece)')
      .order('score', { ascending: false })
      .limit(200)

    if (piece !== 'all') query = query.eq('piece', piece)
    const since = periodStart(period)
    if (since) query = query.gte('played_at', since)

    const { data, error: queryError } = await query
    if (queryError) {
      setError("Le classement n'a pas pu être chargé.")
      setIsLoading(false)
      return
    }

    setError(null)
    setRows(
      bestPerPlayer(
        ((data ?? []) as unknown as ScoreWithProfile[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          username: row.profiles?.username ?? 'Joueur',
          avatarPiece: row.profiles?.avatar_piece ?? 'n',
          piece: row.piece,
          score: row.score,
          captures: row.captures,
          playedAt: row.played_at,
        })),
      ),
    )
    setIsLoading(false)
  }, [piece, period])

  useEffect(() => {
    void load()
  }, [load])

  // Live updates: any new score reloads the board (spec section 2.6).
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('scores-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [load])

  return { rows, isLoading, error, reload: load }
}
