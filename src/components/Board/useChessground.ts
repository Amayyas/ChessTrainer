import { useEffect, useRef, type RefObject } from 'react'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@/components/Board/board.css'

/**
 * chessground on a node of the page. It draws into a node it owns, so it is
 * made once, when the node mounts — and again when `remakeOn` changes, for
 * what chessground fixes at its making — and every change of state reaches it
 * through `set` after that.
 *
 * `setup` turns the config of the moment into what chessground is made with:
 * the options it fixes and its handlers. A handler is bound at that moment,
 * so it reads the latest props through a ref.
 *
 * `putBack` hands chessground the latest config whole. Once a piece is down,
 * chessground has already handed the turn over and dropped the moves it
 * allowed, before the page hears of the move; a move the page does not play
 * has to undo all of that, not the pieces alone, or nothing can be picked up
 * again.
 */
export function useChessground(
  wrapRef: RefObject<HTMLElement>,
  config: Config,
  setup: (config: Config) => Config,
  remakeOn?: unknown,
) {
  const apiRef = useRef<Api | null>(null)
  const latest = useRef(config)
  latest.current = config
  const latestSetup = useRef(setup)
  latestSetup.current = setup
  // The config chessground was made with, which it need not be handed again.
  // The making effect is declared first, so in the same commit it runs first
  // and records this before the config effect compares against it.
  const madeWith = useRef<Config | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const api = Chessground(wrapRef.current, latestSetup.current(latest.current))
    apiRef.current = api
    madeWith.current = latest.current
    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [wrapRef, remakeOn])

  useEffect(() => {
    if (config !== madeWith.current) apiRef.current?.set(config)
  }, [config])

  return {
    apiRef,
    putBack: () => apiRef.current?.set(latest.current),
  }
}
