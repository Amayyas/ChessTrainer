import { expect, test } from '@playwright/test'

/**
 * The board, the engine and a played move — none of it runs under jsdom, so
 * none of it is covered until here. Each test is one "does this actually work
 * in a browser" question, not a feature spec.
 */

test('the landing renders, then hydrates into a working SPA', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))

  await page.goto('/')
  // The h1 is in the prerendered HTML, so it is there before any script runs.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/coach intelligent/i)

  // Client-side navigation off a <Link> proves React hydrated and the router
  // took over — no full reload, no error boundary.
  await page.getByRole('link', { name: 'Mentions légales' }).first().click()
  await expect(page).toHaveURL(/\/mentions-legales$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/mentions légales/i)
  expect(errors).toEqual([])
})

test('a move in Affrontement gets a reply from the engine', async ({ page }) => {
  await page.goto('/battle')

  // Novice — the shallowest search on the ladder, so the quickest reply — then
  // start. The start button only takes its "Commencer" label once the engine
  // has loaded.
  //
  // A radio, not a button: the three settings were rows of buttons carrying
  // aria-pressed and are toggle groups now, so the level is one option of a
  // radiogroup.
  await page.getByRole('radio', { name: /Niveau 1 —/ }).click()
  await page.getByRole('button', { name: 'Commencer la partie' }).click({ timeout: 30_000 })

  const e2 = page.locator('[data-square="e2"]')
  await expect(e2).toBeVisible({ timeout: 30_000 })
  await e2.click()
  await page.locator('[data-square="e4"]').click()

  // 1. e4 followed by a move from Black (the cells render with no whitespace
  // between them) = Stockfish ran a search and replied.
  await expect(page.getByTestId('move-history')).toContainText(/1\.\s*e4\S{2}/, {
    timeout: 30_000,
  })
})

test('the coach boots the engine and shows the board', async ({ page }) => {
  await page.goto('/coach')
  await expect(page.getByText('IA prête')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-square="e2"]')).toBeVisible()
})

test('the Piece Hunt renders its own board, no engine', async ({ page }) => {
  await page.goto('/hunt')
  await expect(page.getByRole('heading', { level: 1, name: 'Chasse aux Pièces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Choisissez votre championne/i })).toBeVisible()
})

test('the puzzle page switches to free practice and serves a board', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))

  await page.goto('/puzzle')
  // The daily series is the default view; its board renders in a browser.
  await expect(page.getByRole('heading', { level: 1, name: 'Puzzles' })).toBeVisible()
  await expect(page.locator('[data-square]').first()).toBeVisible()

  // A tab, not a button. The two views are a tablist now: each control owns a
  // panel, which a pair of pressed buttons never expressed.
  await page.getByRole('tab', { name: 'Entraînement libre' }).click()
  await expect(page.getByText(/Entraînement libre —/)).toBeVisible()

  // The difficulty picker actually drives the session: the checked state moves.
  // aria-checked rather than aria-pressed, for the same reason as the battle
  // settings — a choice among several is a radiogroup.
  const debutant = page.getByRole('radio', { name: 'Débutant' })
  await debutant.click()
  await expect(debutant).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: 'Intermédiaire' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  expect(errors).toEqual([])
})

test('the footer sits at the bottom of a short page, not under its content', async ({ page }) => {
  // jsdom has no layout, so the unit suite can assert the footer exists but not
  // where it lands. The Piece Hunt's chooser is short enough that the page does
  // not scroll — which is exactly where a footer that merely follows the content
  // floats up to the middle, the bug this checks for.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hunt')
  await expect(page.getByRole('heading', { level: 1, name: 'Chasse aux Pièces' })).toBeVisible()

  const gap = await page.evaluate(() => {
    const footer = document.querySelector('footer')!.getBoundingClientRect()
    return {
      fromBottom: window.innerHeight - footer.bottom,
      scrolls: document.documentElement.scrollHeight > window.innerHeight + 2,
    }
  })

  // The control: if the page scrolled, a footer at the end of the content would
  // pass this for the wrong reason, so the premise is asserted too.
  expect(gap.scrolls).toBe(false)
  // Only the layout's own bottom padding separates it from the viewport edge.
  expect(gap.fromBottom).toBeLessThanOrEqual(48)
  expect(gap.fromBottom).toBeGreaterThanOrEqual(0)
})
