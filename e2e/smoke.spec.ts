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
  await page.getByRole('button', { name: /Niveau 1 —/ }).click()
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

  await page.getByRole('button', { name: 'Entraînement libre' }).click()
  await expect(page.getByText(/Entraînement libre —/)).toBeVisible()

  // The difficulty picker actually drives the session: the pressed state moves.
  const debutant = page.getByRole('button', { name: 'Débutant' })
  await debutant.click()
  await expect(debutant).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Intermédiaire' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(errors).toEqual([])
})
