/**
 * Drives the vendored Stockfish (public/stockfish/) from a headless Chromium
 * page, the same way the app does — a Web Worker spoken to over UCI. Shared by
 * scripts/import-lichess-puzzles.mjs (puzzle re-screening) and
 * scripts/calibrate-levels.mjs (battle-level play-testing).
 *
 * Node cannot run the engine's Web Worker build directly, hence the page. The
 * page loads the worker from a throwaway static server for public/.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** A localhost server for public/, so a page can `new Worker('/stockfish/...')`. */
export async function servePublic() {
  const root = fileURLToPath(new URL('../../public/', import.meta.url))
  const types = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.html': 'text/html' }
  const server = createServer(async (req, res) => {
    const url = req.url.split('?')[0]
    if (url === '/') {
      res.setHeader('content-type', 'text/html')
      res.end('<!doctype html><title>engine harness</title>')
      return
    }
    try {
      const path = fileURLToPath(new URL(`.${url}`, `file://${root}`))
      if (!path.startsWith(root)) throw new Error('outside public/')
      const body = await readFile(path)
      res.setHeader(
        'content-type',
        types[path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream',
      )
      res.end(body)
    } catch {
      res.statusCode = 404
      res.end()
    }
  })
  await new Promise((resolve) => server.listen(0, resolve))
  return { server, port: server.address().port }
}

/**
 * Boots one Stockfish worker in `page` under a unique `name` and returns a
 * search function. `options` is a list of raw `setoption name … value …`
 * strings, sent once during the UCI handshake.
 *
 * `search(fen, depth)` resolves `{ best, first, second }`: `best` is the
 * bestmove in UCI, `first`/`second` are the `score` of multipv lines 1 and 2
 * from the deepest iteration (`second` is null unless `MultiPV` ≥ 2 was set).
 * Two engines can run side by side by booting them under different names.
 */
export async function bootEngine(page, { name = 'sf', options = [] } = {}) {
  await page.evaluate(
    ({ name, options }) =>
      new Promise((resolve) => {
        const sf = new Worker('/stockfish/stockfish.js')
        const state = { sf, ready: false, onLine: null }
        globalThis[`__engine_${name}`] = state
        sf.onmessage = (event) => {
          const line = String(event.data)
          if (/^uciok/.test(line)) sf.postMessage('isready')
          else if (/^readyok/.test(line) && !state.ready) {
            state.ready = true
            resolve()
          }
          state.onLine?.(line)
        }
        sf.postMessage('uci')
        for (const option of options) sf.postMessage(option)
      }),
    { name, options },
  )

  return (fen, depth) =>
    page.evaluate(
      ({ name, fen, depth }) =>
        new Promise((resolve) => {
          const state = globalThis[`__engine_${name}`]
          const scores = new Map()
          state.onLine = (line) => {
            const multipv = line.match(/multipv (\d+)/)
            const score = line.match(/score (cp|mate) (-?\d+)/)
            if (line.startsWith('info') && score) {
              scores.set(multipv ? Number(multipv[1]) : 1, {
                kind: score[1],
                value: Number(score[2]),
              })
            }
            const best = line.match(/^bestmove (\S+)/)
            if (best) {
              state.onLine = null
              resolve({
                best: best[1],
                first: scores.get(1) ?? null,
                second: scores.get(2) ?? null,
              })
            }
          }
          // ucinewgame clears killers and history so a prior position cannot
          // bias this search's move ordering.
          state.sf.postMessage('ucinewgame')
          state.sf.postMessage(`position fen ${fen}`)
          state.sf.postMessage(`go depth ${depth}`)
        }),
      { name, fen, depth },
    )
}
