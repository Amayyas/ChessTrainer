import { describe, expect, it } from 'vitest'
import { render } from '@/entry-server'

/**
 * `render` is the build-time entry point scripts/prerender.mjs calls to bake
 * '/' into dist/index.html — see that script for why. A mismatch between what
 * this renders and what main.tsx mounts client-side is a hydration mismatch on
 * every visit, so this pins it to the same landmarks App.test.tsx checks for
 * the client render, on the one route that gets prerendered.
 */
describe('entry-server render', () => {
  it('renders the landing markup for /', () => {
    const html = render('/')

    expect(html).toContain('Apprenez les échecs')
    expect(html).toContain('Essayer le coach')
    expect(html).toContain('Mentions légales')
  })

  it('renders every mode card', () => {
    const html = render('/')

    expect(html).toContain('Coach IA')
    expect(html).toContain('Affrontement')
    expect(html).toContain('Puzzles')
    expect(html).toContain('Chasse aux Pièces')
  })
})
