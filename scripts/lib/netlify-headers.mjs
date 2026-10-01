/**
 * The `[[headers]]` rules of netlify.toml, read rather than restated, so that
 * scripts/serve-dist.mjs answers each request with the headers production
 * would send — the Content-Security-Policy included.
 *
 * Restating them by hand is how the test server came to send Cache-Control and
 * nothing else: no test ran under the CSP, and the duplicate could drift from
 * the original without anything failing. The same kind of copy hid the header
 * ordering bug fixed in 2.3.1.
 *
 * Netlify applies every rule whose `for` matches the path and lets the last one
 * win each header it sets again; it does not pick the most specific rule.
 * `headersFor` does the same, in file order.
 *
 * Not a TOML parser. The repository has none among its dependencies, and this
 * reads only the shape netlify.toml uses for headers: a `for = "..."` line and
 * `Name = "value"` pairs under `[headers.values]`. Anything else inside a
 * headers block throws, so a rule written in a form this does not understand
 * stops the server instead of being served without its headers.
 */

/** @typedef {{ for: string, values: Record<string, string> }} HeaderRule */

/**
 * @param {string} toml the text of netlify.toml
 * @returns {HeaderRule[]} the `[[headers]]` rules, in file order
 */
export function parseHeaderRules(toml) {
  /** @type {HeaderRule[]} */
  const rules = []
  /** @type {{ for: string | null, values: Record<string, string> } | null} */
  let rule = null
  let inValues = false

  const close = (lineNumber) => {
    if (!rule) return
    if (rule.for === null)
      throw new Error(`netlify.toml:${lineNumber}: [[headers]] without a "for"`)
    rules.push({ for: rule.for, values: rule.values })
    rule = null
  }

  toml.split('\n').forEach((raw, index) => {
    const lineNumber = index + 1
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) return

    if (line.startsWith('[')) {
      if (line === '[[headers]]') {
        close(lineNumber)
        rule = { for: null, values: {} }
        inValues = false
      } else if (line === '[headers.values]' && rule) {
        inValues = true
      } else {
        // Any other table ends the headers block.
        close(lineNumber)
        inValues = false
      }
      return
    }
    if (!rule) return

    const pair = /^([A-Za-z0-9-]+)\s*=\s*"((?:[^"\\]|\\.)*)"$/.exec(line)
    if (!pair)
      throw new Error(`netlify.toml:${lineNumber}: unsupported line in [[headers]]: ${line}`)
    const [, key, value] = pair
    if (value.includes('\\')) {
      throw new Error(`netlify.toml:${lineNumber}: escape sequences are not supported: ${line}`)
    }
    if (inValues) rule.values[key] = value
    else if (key === 'for') rule.for = value
    else throw new Error(`netlify.toml:${lineNumber}: unsupported key in [[headers]]: ${key}`)
  })
  close(toml.split('\n').length)
  return rules
}

/**
 * Whether a `for` pattern matches a request path. Netlify's splat is a
 * trailing `/*`, which matches the directory and everything under it; any
 * other pattern is an exact path. Placeholders (`:name`) and splats elsewhere
 * throw rather than silently never matching.
 *
 * @param {string} pattern
 * @param {string} path
 */
export function matches(pattern, path) {
  if (pattern.includes(':') || pattern.slice(0, -1).includes('*')) {
    throw new Error(`unsupported header path pattern: ${pattern}`)
  }
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1)
    return path.startsWith(prefix) || path === prefix.slice(0, -1)
  }
  return path === pattern
}

/**
 * The headers Netlify sends for a request path: every matching rule applied in
 * file order, the last one winning each header. Names are lower-cased, as
 * Node's response headers and the fetch API report them.
 *
 * @param {HeaderRule[]} rules
 * @param {string} path the request's pathname, before any rewrite
 * @returns {Record<string, string>}
 */
export function headersFor(rules, path) {
  /** @type {Record<string, string>} */
  const headers = {}
  for (const rule of rules) {
    if (!matches(rule.for, path)) continue
    for (const [name, value] of Object.entries(rule.values)) headers[name.toLowerCase()] = value
  }
  return headers
}
