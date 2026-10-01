import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { headersFor, matches, parseHeaderRules } from '../../scripts/lib/netlify-headers.mjs'

/**
 * scripts/lib/netlify-headers.mjs, which scripts/serve-dist.mjs uses to send
 * the smoke tests and Lighthouse the headers netlify.toml declares. If it
 * resolved the rules differently from Netlify, the tests would run under a
 * policy production never serves — the duplication this replaced, moved one
 * file over.
 */

const toml = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8')
const rules = parseHeaderRules(toml)

describe('netlify.toml header rules', () => {
  it('reads every [[headers]] block in the file', () => {
    // Counted from the text, so a block the reader skipped cannot pass.
    expect(rules).toHaveLength(toml.match(/^\s*\[\[\s*headers\s*\]\]/gm)?.length ?? -1)
    expect(rules.map((rule) => rule.for)).toEqual(['/*', '/assets/*', '/stockfish/*'])
  })

  it('serves the CSP on documents, assets and the engine alike', () => {
    // The engine runs in a worker, and a worker is governed by the policy on
    // its own script's response, not the page's.
    const csp = rules[0]?.values['Content-Security-Policy-Report-Only']
    expect(csp).toMatch(/default-src 'self'/)
    for (const path of ['/', '/coach', '/assets/index-abc.js', '/stockfish/stockfish.js']) {
      expect(headersFor(rules, path)['content-security-policy-report-only']).toBe(csp)
    }
  })

  it('lets the last matching rule win, as Netlify does', () => {
    // The 2.3.1 bug: Netlify does not pick the most specific rule. The
    // narrow rules come after the catch-all in the file, which is the only
    // reason they win.
    expect(headersFor(rules, '/assets/index-abc.js')['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(headersFor(rules, '/stockfish/stockfish.wasm')['cache-control']).toBe(
      'public, max-age=86400, must-revalidate',
    )
    expect(headersFor(rules, '/coach')['cache-control']).toBe('public, max-age=0, must-revalidate')

    // The control: with the order reversed, the catch-all must win — or the
    // reader is choosing by specificity and the assertions above prove nothing.
    const reversed = [...rules].reverse()
    expect(headersFor(reversed, '/assets/index-abc.js')['cache-control']).toBe(
      'public, max-age=0, must-revalidate',
    )
  })
})

describe('matches', () => {
  it('treats a trailing splat as the directory and everything under it', () => {
    expect(matches('/*', '/')).toBe(true)
    expect(matches('/*', '/coach')).toBe(true)
    expect(matches('/assets/*', '/assets/a/b.js')).toBe(true)
    expect(matches('/assets/*', '/assets')).toBe(true)
    expect(matches('/assets/*', '/assetsx/a.js')).toBe(false)
    expect(matches('/coach', '/coach')).toBe(true)
    expect(matches('/coach', '/coach/x')).toBe(false)
  })

  it('refuses the patterns it does not implement rather than never matching', () => {
    expect(() => matches('/puzzle/:id', '/puzzle/1')).toThrow(/unsupported/)
    expect(() => matches('/*.js', '/a.js')).toThrow(/unsupported/)
  })
})

describe('parseHeaderRules', () => {
  it('ignores comments and the tables around the headers', () => {
    const parsed = parseHeaderRules(
      [
        '[build]',
        '  command = "npm run build"',
        '# a comment',
        '[[headers]]',
        '  for = "/*"',
        '  [headers.values]',
        '    X-One = "1"',
        '',
        '[[redirects]]',
        '  from = "/*"',
      ].join('\n'),
    )
    expect(parsed).toEqual([{ for: '/*', values: { 'X-One': '1' } }])
  })

  it('reads table lines that carry a trailing comment', () => {
    const parsed = parseHeaderRules(
      [
        '[[headers]] # engine',
        '  for = "/*"',
        '  [headers.values] # security',
        '    X-A = "1"',
      ].join('\n'),
    )
    expect(parsed).toEqual([{ for: '/*', values: { 'X-A': '1' } }])
  })

  it('throws on a header it cannot read, instead of serving without it', () => {
    // Valid TOML for the same tables; read as "some other table", each would
    // end the block and drop its headers without a word.
    expect(() => parseHeaderRules('[[ headers ]]\n  for = "/*"')).toThrow(/unsupported headers/)
    expect(() =>
      parseHeaderRules('[[headers]]\n  for = "/*"\n  [ headers.values ]\n    X-A = "1"'),
    ).toThrow(/unsupported headers/)

    const multiline = ['[[headers]]', '  for = "/*"', '  [headers.values]', "    X-A = '''", "'''"]
    expect(() => parseHeaderRules(multiline.join('\n'))).toThrow(/unsupported line/)
    expect(() => parseHeaderRules('[[headers]]\n  [headers.values]\n    X-A = "1"')).toThrow(
      /without a "for"/,
    )
  })
})
