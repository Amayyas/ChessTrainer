import { useCallback, useRef, useState } from 'react'
import { normalizeUsername, USERNAME_FORMAT, USERNAME_TAKEN, usernameProblem } from '@/lib/username'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Checks a typed username the way the database will — format first, here,
 * then whether it is free, by asking — so the player hears about a problem
 * next to the field rather than after the account exists under another name.
 *
 * `validate` resolves to the name as it should be sent, or null when there is
 * a problem, which `problem` then describes. Only the latest question is
 * listened to: the answer to one asked on leaving the field can arrive after
 * the player has gone back and typed something else.
 */
export function useUsernameCheck() {
  const checkUsername = useAuthStore((state) => state.checkUsername)
  const [problem, setProblem] = useState<string | null>(null)
  const latest = useRef(0)

  const validate = useCallback(
    async (raw: string): Promise<string | null> => {
      const asked = (latest.current += 1)
      const name = normalizeUsername(raw)
      const local = usernameProblem(name)
      if (local) {
        setProblem(local)
        return null
      }
      const status = await checkUsername(name)
      if (asked !== latest.current) return null
      const found =
        status === 'taken' ? USERNAME_TAKEN : status === 'invalid' ? USERNAME_FORMAT : null
      setProblem(found)
      return found ? null : name
    },
    [checkUsername],
  )

  const clear = useCallback(() => {
    latest.current += 1
    setProblem(null)
  }, [])

  return { problem, validate, clear }
}
