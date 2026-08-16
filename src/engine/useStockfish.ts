import { useCallback, useEffect, useRef, useState } from 'react'
import type { EngineLevel } from '@/engine/levels'
import { StockfishEngine, type Analysis } from '@/engine/stockfishEngine'

export interface UseStockfishOptions {
  /** Only boot the engine when true, so the 5 MB worker loads on demand. */
  enabled?: boolean
  /** Search depth; 12–18 is the useful range here. */
  depth?: number
}

export interface UseStockfish {
  isReady: boolean
  isAnalyzing: boolean
  analyze: (fen: string, depth?: number) => Promise<Analysis | null>
  /** Calibrates playing strength for the battle mode. */
  configureLevel: (level: EngineLevel) => Promise<void>
}

/**
 * React binding for {@link StockfishEngine}. Creates the worker lazily, reports
 * readiness and busy state, and disposes the worker on unmount.
 */
export function useStockfish({
  enabled = true,
  depth = 15,
}: UseStockfishOptions = {}): UseStockfish {
  const engineRef = useRef<StockfishEngine | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    // No Worker in this environment (e.g. jsdom tests): stay gracefully idle.
    if (!enabled || typeof Worker === 'undefined') return

    const engine = new StockfishEngine()
    engineRef.current = engine
    let cancelled = false

    engine
      .init()
      .then(() => {
        if (!cancelled) setIsReady(true)
      })
      .catch(() => {
        // A failed engine leaves the coach usable without analysis.
      })

    return () => {
      cancelled = true
      engine.dispose()
      engineRef.current = null
      setIsReady(false)
    }
  }, [enabled])

  const analyze = useCallback(
    async (fen: string, overrideDepth?: number): Promise<Analysis | null> => {
      const engine = engineRef.current
      if (!engine) return null

      setIsAnalyzing(true)
      try {
        return await engine.analyze(fen, overrideDepth ?? depth)
      } catch {
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [depth],
  )

  const configureLevel = useCallback(async (level: EngineLevel) => {
    await engineRef.current?.configureLevel(level)
  }, [])

  return { isReady, isAnalyzing, analyze, configureLevel }
}
