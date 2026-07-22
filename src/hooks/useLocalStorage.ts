import { useCallback, useState } from 'react'

/**
 * State mirrored into localStorage. Reads are guarded so a private-mode or
 * quota failure degrades to plain in-memory state instead of breaking the page.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initialValue : (JSON.parse(stored) as T)
    } catch {
      return initialValue
    }
  })

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // Storage unavailable: keep the value in memory only.
        }
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
