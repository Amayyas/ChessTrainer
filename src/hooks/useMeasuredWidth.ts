import { useEffect, useState, type RefObject } from 'react'

/**
 * Tracks an element's width. react-chessboard's own auto-sizing renders nothing
 * until it observes a pixel width, which is unreliable inside a CSS grid cell,
 * so both boards measure their container and pass an explicit width.
 *
 * Returns null until the first measurement, and `forced` short-circuits it for
 * tests, where there is no layout to observe.
 */
export function useMeasuredWidth(ref: RefObject<HTMLElement>, forced?: number): number | null {
  const [width, setWidth] = useState<number | null>(forced ?? null)

  useEffect(() => {
    if (forced || !ref.current) return
    const element = ref.current

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width
      if (measured) setWidth(Math.floor(measured))
    })
    observer.observe(element)
    setWidth(Math.floor(element.clientWidth))

    return () => observer.disconnect()
  }, [ref, forced])

  return forced ?? width
}
