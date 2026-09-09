/**
 * Vendors the Stockfish engine into public/stockfish/.
 *
 * The engine is not an npm dependency: `stockfish@18` ships every build flavor
 * (two of them >110 MB), ~240 MB installed, and CI would pay that on every
 * `npm ci`. So the three files the app serves are downloaded from a pinned
 * GitHub release, checked against a known hash, and committed.
 *
 * Build: `stockfish-18-lite-single` — Stockfish 18, NNUE (small net, embedded
 * in the wasm), single-threaded. No SharedArrayBuffer, so no COOP/COEP; the
 * nmrugg README recommends it for exactly this case ("still far stronger than
 * any human will ever be").
 *
 * Run after bumping RELEASE: `npm run vendor:stockfish`, then commit
 * public/stockfish/. Regenerate every hash in EXPECTED on a bump and eyeball
 * the three diffs — the license included, since it rides the same tag.
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RELEASE = 'v18.0.0'
const BUILD = 'stockfish-18-lite-single'
const BASE = `https://github.com/nmrugg/stockfish.js/releases/download/${RELEASE}`
const LICENSE_URL = `https://raw.githubusercontent.com/nmrugg/stockfish.js/${RELEASE}/Copying.txt`

/** sha256 of every asset at RELEASE — regenerate (and eyeball the diff) on a bump. */
const EXPECTED = {
  js: '2278005057f381491f1c9bb3e44c9f5920b3a00bef9759e33cc6582769a1f1fe',
  wasm: 'a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1',
  license: '0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b',
}

const OUT = fileURLToPath(new URL('../public/stockfish/', import.meta.url))

async function fetchChecked(url, expectedSha) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const sha = createHash('sha256').update(bytes).digest('hex')
  if (sha !== expectedSha) {
    throw new Error(`${url}\n  expected sha256 ${expectedSha}\n  got          ${sha}`)
  }
  return bytes
}

await mkdir(OUT, { recursive: true })

const [js, wasm, license] = await Promise.all([
  fetchChecked(`${BASE}/${BUILD}.js`, EXPECTED.js),
  fetchChecked(`${BASE}/${BUILD}.wasm`, EXPECTED.wasm),
  fetchChecked(LICENSE_URL, EXPECTED.license),
])

// These three writes persist bytes fetched over the network — but only after
// fetchChecked has matched each one against a pinned SHA-256 and thrown
// otherwise, and only to these fixed names (CodeQL js/http-to-file-access
// cannot see the hash gate and flags them regardless; dismissed).
//
// The app loads them by fixed name (src/engine/stockfishEngine.ts), and the
// worker resolves its wasm as `<script path>.wasm` — so they must sit together
// and share a basename.
await writeFile(join(OUT, 'stockfish.js'), js)
await writeFile(join(OUT, 'stockfish.wasm'), wasm)
await writeFile(join(OUT, 'LICENSE.txt'), license)

console.log(`vendored ${BUILD} (${RELEASE}) -> public/stockfish/`)
console.log(`  stockfish.js    ${(js.length / 1024).toFixed(0)} KB`)
console.log(`  stockfish.wasm  ${(wasm.length / 1024 / 1024).toFixed(1)} MB`)
