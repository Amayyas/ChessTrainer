import { devices, type Locator, type Page } from '@playwright/test'
import { INLINE_LINK } from '@/components/UI/link'
import { RUBRIC_ALERT } from '@/components/UI/rubricBlock'
import { newsprint } from '@/lib/design-tokens'
import { expect, test } from './csp'

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

/**
 * Clicks a square on the board from its place on screen, as a player finds it:
 * chessground draws the pieces and the marks, not an element per square. The
 * board is taken to be turned to White.
 */
async function clickSquare(page: Page, square: string) {
  const board = await page.locator('.cg-wrap').boundingBox()
  if (!board) throw new Error('No board on the page')
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const rank = Number(square[1])
  await page.mouse.click(
    board.x + ((file + 0.5) * board.width) / 8,
    board.y + ((8 - rank + 0.5) * board.height) / 8,
  )
}

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

  await expect(page.locator('.cg-wrap piece').first()).toBeVisible({ timeout: 30_000 })
  await clickSquare(page, 'e2')
  await clickSquare(page, 'e4')

  // 1. e4 followed by a move from Black (the cells render with no whitespace
  // between them) = Stockfish ran a search and replied.
  await expect(page.getByTestId('move-history')).toContainText(/1\.\s*e4\S{2}/, {
    timeout: 30_000,
  })
})

test('the landing’s diagram holds its squares before chessground arrives', async ({ page }) => {
  // The diagram is the page's largest paint. Its frame draws the squares from
  // the first paint, so the page does not wait for the board's script to show
  // it: measured on a slowed phone, waiting cost the landing 1.6 s.
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route(/\/assets\/ChessBoard-[^/]*\.js$/, async (route) => {
    await held
    await route.continue()
  })
  await page.goto('/')

  const frame = page.locator('#diagramme-1 .aspect-square')
  const squares = () =>
    frame.evaluate((element) => decodeURIComponent(getComputedStyle(element).backgroundImage))
  await expect.poll(squares).toContain('pattern id="hatch"')
  // The control: chessground has not arrived, so the squares are the frame's.
  await expect(page.locator('.cg-wrap')).toHaveCount(0)

  release()
  await expect(page.locator('.cg-wrap piece').first()).toBeVisible({ timeout: 30_000 })
})

test('the coach boots the engine and shows the board', async ({ page }) => {
  await page.goto('/coach')
  await expect(page.getByText('IA prête')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('img', { name: 'Échiquier' })).toBeVisible()
  // Every piece of the starting position; chessground also keeps a hidden ghost
  // piece for dragging, which is not one.
  await expect(page.locator('.cg-wrap piece:not(.ghost)')).toHaveCount(32)
})

test('a move typed into the field under the board is played on it', async ({ page }) => {
  // chessground answers the pointer alone; the field is the keyboard's way in.
  await page.goto('/coach')
  await expect(page.locator('.cg-wrap piece').first()).toBeVisible({ timeout: 30_000 })
  const field = page.getByRole('textbox', { name: 'Jouer au clavier' })

  await field.fill('e4')
  await field.press('Enter')
  await field.fill('Cf6')
  await field.press('Enter')

  // Both moves in the list, and on the board the rubric on the last one's
  // squares; the field is empty and still has the focus for the next.
  await expect(page.getByTestId('move-history')).toContainText(/1\.\s*e4.*f6/)
  // Shown ones only: chessground hides the marks it is done with, to reuse.
  await expect(page.locator('.cg-wrap square.last-move:visible')).toHaveCount(2)
  await expect(field).toHaveValue('')
  await expect(field).toBeFocused()

  // A move the position does not allow is said, not played.
  await field.fill('Dh4')
  await field.press('Enter')
  await expect(page.getByText(/Dh4.+n’est pas un coup possible ici/)).toBeVisible()
  await expect(field).toHaveAttribute('aria-invalid', 'true')
})

test('the squares turn plain on the button under the board, and stay so', async ({ page }) => {
  /** The squares the board draws, as the data URI its frame is handed. */
  const squares = () =>
    page
      .locator('.cg-wrap')
      .evaluate((wrap) =>
        decodeURIComponent(
          getComputedStyle(wrap.parentElement!).getPropertyValue('--board-squares'),
        ),
      )

  await page.goto('/coach')
  await expect(page.locator('.cg-wrap piece').first()).toBeVisible({ timeout: 30_000 })
  // The control: hatched to begin with, so the change below is the button's.
  expect(await squares()).toContain('pattern id="hatch"')

  const toggle = page.getByRole('button', { name: 'Cases unies' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(await squares()).not.toContain('pattern')

  // Kept on the device: still plain after a reload.
  await page.reload()
  await expect(page.locator('.cg-wrap piece').first()).toBeVisible({ timeout: 30_000 })
  expect(await squares()).not.toContain('pattern')

  // The landing's diagram is the printed figure, hatched whatever the choice.
  await page.goto('/')
  await expect(page.locator('.cg-wrap piece').first()).toBeVisible({ timeout: 30_000 })
  expect(await squares()).toContain('pattern id="hatch"')
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
  await expect(page.locator('.cg-wrap piece').first()).toBeVisible()

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

type ShiftScope = {
  layoutShift: number
  shifts: PerformanceObserver
  addShifts: (entries: PerformanceEntryList) => void
}

/**
 * Loads `path` on a slow connection and returns the layout shift it causes.
 *
 * The route's chunk is held until the spinner has been seen, so the slow path
 * runs on every run, and the held requests are counted, so a renamed chunk
 * cannot skip it unnoticed. Shifts are summed until `ready`, and a second
 * after it, so whatever the page does once it is up falls inside the window.
 * Before returning, a shift caused on purpose has to register: the control
 * that tells a zero from an observer that saw nothing.
 */
async function shiftWhileArriving(
  page: Page,
  path: string,
  chunk: RegExp,
  ready: () => Promise<void>,
): Promise<number> {
  let release = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  let heldRequests = 0
  await page.route(chunk, async (route) => {
    heldRequests += 1
    await held
    await route.continue()
  })
  await page.addInitScript(() => {
    // Every entry counts, hadRecentInput included: nothing here gives input,
    // and Chromium under automation was measured flagging shifts as following
    // input when none had come.
    const scope = window as unknown as ShiftScope
    scope.layoutShift = 0
    scope.addShifts = (entries) => {
      for (const entry of entries)
        scope.layoutShift += (entry as PerformanceEntry & { value: number }).value
    }
    scope.shifts = new PerformanceObserver((list) => scope.addShifts(list.getEntries()))
    scope.shifts.observe({ type: 'layout-shift', buffered: true })
  })

  await page.goto(path, { waitUntil: 'commit' })
  await expect(page.getByRole('status', { name: 'Chargement de la page' })).toBeVisible()
  await expect(page.locator('footer')).toHaveCSS('visibility', 'hidden')
  expect(heldRequests).toBeGreaterThan(0)
  release()

  await ready()
  await expect(page.locator('footer')).toHaveCSS('visibility', 'visible')
  await page.waitForTimeout(1000)

  // A shift is reported after the frame that made it, and the observer hands
  // its entries over later still. So each reading lets a frame paint, then
  // takes what the observer has queued but not yet delivered.
  const readShift = () =>
    page.evaluate(async () => {
      const scope = window as unknown as ShiftScope
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      scope.addShifts(scope.shifts.takeRecords())
      return scope.layoutShift
    })
  const shift = await readShift()

  await page.evaluate(() => {
    const block = document.createElement('div')
    block.style.height = '200px'
    document.querySelector('main')?.prepend(block)
  })
  await expect.poll(readShift).toBeGreaterThan(shift + 0.01)
  return shift
}

test.describe('on a phone, while a slow page arrives', () => {
  // The shift was measured by Lighthouse's phone run, so a phone it is: a
  // Pixel 7's screen, less its browser type, which a group may not set.
  const phone = devices['Pixel 7']
  test.use({
    viewport: phone.viewport,
    userAgent: phone.userAgent,
    deviceScaleFactor: phone.deviceScaleFactor,
    isMobile: phone.isMobile,
    hasTouch: phone.hasTouch,
  })

  test('nothing moves on a long page, nor when its engine comes up', async ({ page }) => {
    // /coach is taller than the screen. Under the spinner the footer used to sit
    // in view and be pushed off it by the page — 0.17 — and the coach's header
    // changed height when the engine came up.
    const shift = await shiftWhileArriving(page, '/coach', /\/assets\/CoachPage-[\w-]+\.js$/, () =>
      expect(page.getByText('IA prête')).toBeVisible({ timeout: 30_000 }),
    )
    expect(shift).toBeLessThan(0.001)
  })

  test('nothing moves on a short page', async ({ page }) => {
    // /login fits on the screen. A spinner made a screen tall, the first fix
    // tried, kept the footer out of view on a long page and then let it rise
    // into view here: 0.08.
    const shift = await shiftWhileArriving(page, '/login', /\/assets\/LoginPage-[\w-]+\.js$/, () =>
      expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    )
    expect(shift).toBeLessThan(0.001)
  })
})

test('the evaluation gauge stands centred over its figures', async ({ page }) => {
  // A fixed-width bar told to stretch across its column falls back to the
  // column's start: the bar hugged the left edge of the gauge, under centred
  // figures, and its middle tick stuck out past the column. jsdom has no
  // layout, so only here can it be measured.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/coach')
  const gauge = page.getByRole('img', { name: /^Évaluation/ })
  await expect(gauge).toBeVisible()

  const { column, bar, figures } = await gauge.evaluate((element) => {
    const centre = (target: Element) => {
      const box = target.getBoundingClientRect()
      return (box.left + box.right) / 2
    }
    return {
      column: centre(element),
      bar: centre(element.querySelector('div')!),
      figures: centre(element.querySelector('span')!),
    }
  })
  // The control: the figures are centred, so the column is measured right.
  expect(Math.abs(figures - column)).toBeLessThan(0.5)
  expect(Math.abs(bar - column)).toBeLessThan(0.5)
})

test('a link in an alert stays readable under the pointer', async ({ page }) => {
  // An inline link turns to the rubric under the pointer, the ground of an
  // alert: on the expired-link screen, the link to ask for a new one vanished
  // when pointed at. Hover is a browser's to compute, so it is checked here, on
  // an alert set with the classes Alert and the inline links use. The screens
  // that show one need an account server, which a build without its keys —
  // this job's — does not have, so the alert is laid on a page that is always
  // there.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/mentions-legales')
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(newsprint.rubric.slice(at, at + 2), 16))
  const rubric = `rgb(${r}, ${g}, ${b})`

  // The colour eases over 150 ms, and a reading taken mid-way passes whatever
  // it eases to: wait for the transition to run out, then read it once.
  const colourUnderPointer = async (link: Locator) => {
    await link.hover()
    await link.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    )
    return link.evaluate((element) => getComputedStyle(element).color)
  }

  // The control: an inline link on the page does turn to the rubric under the
  // pointer, so hover applies in this browser and a pass below means something.
  expect(
    await colourUnderPointer(page.getByRole('link', { name: 'contact@chesstrainer.fr' })),
  ).toBe(rubric)

  await page.evaluate(
    ([alertClasses, linkClasses]) => {
      const alert = document.createElement('p')
      alert.setAttribute('role', 'alert')
      alert.className = alertClasses!
      const link = document.createElement('a')
      link.href = '/mot-de-passe-oublie'
      link.className = linkClasses!
      link.textContent = 'demandez-en un nouveau'
      alert.append('Ce lien n’est plus valide : ', link, '.')
      document.querySelector('main')!.prepend(alert)
    },
    [RUBRIC_ALERT, INLINE_LINK],
  )
  const alert = page.getByRole('alert')
  expect(await alert.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(rubric)
  expect(await colourUnderPointer(alert.getByRole('link'))).not.toBe(rubric)
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
