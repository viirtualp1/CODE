// Run against `npm run dev -- --port 5178`. Playwright is an optional QA tool;
// use PLAYWRIGHT_MODULE for a preinstalled runtime without changing app dependencies.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5178'
const output = process.env.UI_OUTPUT || 'outputs/redesign'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' })
const errors = []
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, colorScheme: 'light' })
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
page.setDefaultTimeout(8000)
const button = name => page.getByRole('button', { name, exact: true })
const settle = async () => {
  await page.locator('.app-drawer.closing').waitFor({ state: 'detached' })
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})))
  })
}
const ready = async () => { await page.locator('.app-shell:not(.is-loading)').waitFor() }
const state = () => page.evaluate(async () => {
  const game = (await import('/src/stores/game.ts')).useGameStore()
  return { id: game.currentId, session: JSON.parse(JSON.stringify(game.session)), resumeId: game.resumeId, checked: [...game.checked], theme: game.theme, selected: game.selected, pending: game.pendingSaves }
})
const durable = () => page.waitForFunction(async () => (await import('/src/stores/game.ts')).useGameStore().pendingSaves === 0)
async function theme(value) {
  await button('Open menu').click(); await settle()
  await page.locator('.drawer-menu').getByRole('button', { name: 'Settings', exact: true }).click(); await settle()
  await page.getByRole('radio', { name: value, exact: true }).check()
  await button('Back').click(); await page.locator('.keyboard').waitFor(); await settle()
}
async function noHorizontalOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  const surface = page.locator('.app-screen:visible, .home-screen:visible').first()
  if (await surface.count()) assert.equal(await surface.evaluate(el => el.scrollWidth > el.clientWidth + 1), false)
}
async function fitGame(label) {
  await settle()
  const result = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect()
    const toolbar = rect('.puzzle-toolbar'), keyboard = rect('.keyboard'), author = rect('.attribution')
    const words = [...document.querySelectorAll('.board-presentation .cipher-word')].map(word => word.getBoundingClientRect())
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      keyboardBottom: keyboard.bottom, toolbarTop: toolbar.top, authorBottom: author.bottom,
      wordOverflow: words.some(word => word.left < -1 || word.right > innerWidth + 1 || word.top < 47 || word.bottom > toolbar.top + 1),
      tabStops: document.querySelectorAll('.board-presentation .cipher-cell[tabindex="0"]').length,
      hiddenInput: !!document.querySelector('.app-body input, .app-body textarea, .app-body [contenteditable="true"]') }
  })
  assert.ok(result.scrollWidth <= result.width, `${label}: horizontal overflow`)
  assert.ok(result.scrollHeight <= result.height + 1, `${label}: document scroll`)
  assert.ok(result.keyboardBottom <= result.height + 1, `${label}: keyboard clipped`)
  assert.ok(result.authorBottom <= result.toolbarTop + 1, `${label}: attribution overlap`)
  assert.equal(result.wordOverflow, false, `${label}: clipped quote`)
  assert.equal(result.tabStops, 1, `${label}: board must have a single tab stop`)
  assert.equal(result.hiddenInput, false, `${label}: native IME transport`)
}
const cdp = await context.newCDPSession(page)
const touch = async (type, x = 0, y = 0) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] })
async function openDrawer() { await button('Open menu').click(); await page.locator('.app-drawer[open]').waitFor(); await settle() }
try {
  await page.goto(base); await ready(); await settle()
  assert.equal(new URL(page.url()).hash, '')
  assert.equal(await button('Play').count(), 1)
  assert.equal(await page.locator('.keyboard').count(), 0)
  assert.equal((await state()).theme, 'system')
  await page.screenshot({ path: `${output}/home-light.png` })
  await button('How to play').click(); await settle()
  const beforePractice = await state()
  await page.locator('.practice-keys').getByRole('button', { name: 'A', exact: true }).click()
  assert.equal(await page.locator('.tutorial .mistake').count(), 0)
  await page.locator('.practice-tools').getByRole('button', { name: 'Check', exact: true }).click()
  assert.ok(await page.locator('.tutorial .mistake').count() > 0)
  await page.locator('.practice-tools').getByRole('button', { name: 'Undo last move', exact: true }).click()
  await page.locator('.tutorial .cipher-cell:not(.clue)').first().click()
  await page.locator('.practice-keys').getByRole('button', { name: 'O', exact: true }).click()
  assert.equal(await page.locator('.tutorial .cell-letter').filter({ hasText: /^O$/ }).count(), 3)
  await page.locator('.practice-keys').getByRole('button', { name: 'H', exact: true }).click()
  assert.match(await page.locator('.practice-message').innerText(), /decoded/)
  assert.deepEqual((await state()).session, beforePractice.session)
  await button('Try again').click(); await button('Skip practice').click(); await settle()
  assert.equal(await page.locator('.home-help').evaluate(el => el === document.activeElement), true)
  await button('Settings').click(); await settle()
  assert.equal(new URL(page.url()).pathname, '/settings')
  assert.equal(new URL(page.url()).hash, '')
  assert.equal(await page.getByRole('radio').evaluateAll(radios => radios.every(radio => radio.getBoundingClientRect().height >= 44)), true)
  assert.deepEqual(await page.getByRole('radio').evaluateAll(radios => radios.map(radio => radio.value)), ['system', 'dark', 'light'])
  await page.emulateMedia({ colorScheme: 'dark' }); await settle()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.getByRole('radio', { name: 'Light', exact: true }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await durable(); await page.reload(); await ready(); await settle()
  assert.equal(await page.getByRole('radio', { name: 'Light', exact: true }).isChecked(), true)
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await page.getByRole('radio', { name: 'System', exact: true }).check()
  await page.emulateMedia({ colorScheme: 'light' }); await settle()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await page.screenshot({ path: `${output}/settings-light.png` })
  await page.getByRole('radio', { name: 'Dark', exact: true }).check(); await durable()
  await page.screenshot({ path: `${output}/settings-dark.png` })
  await button('Back').click(); await button('Play').click(); await page.locator('.keyboard').waitFor(); await settle()
  await page.locator('.board-presentation .cipher-cell:not(.clue)').first().click()
  await page.locator('.keyboard .letter-key').filter({ hasText: /^H$/ }).click(); await durable()
  const saved = await state()
  assert.ok(saved.session.undo.length > 0)
  await openDrawer(); await page.locator('.drawer-menu').getByRole('button', { name: 'Main menu', exact: true }).click(); await settle()
  assert.equal(await button('Continue').count(), 1)
  await page.goBack(); await settle()
  assert.equal(await page.locator('.home-screen:visible').count(), 1)
  await page.reload(); await ready(); await settle()
  assert.equal(await button('Continue').count(), 1)
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.screenshot({ path: `${output}/home-dark.png` })
  await button('How to play').click(); await settle()
  await page.screenshot({ path: `${output}/tutorial-dark.png` })
  await page.locator('.tutorial-actions .primary-button').click(); await page.locator('.keyboard').waitFor()
  assert.deepEqual((await state()).session, saved.session)
  await button('Restart this puzzle').click()
  await button('Cancel').click()
  assert.deepEqual((await state()).session, saved.session)

  await openDrawer(); await page.locator('.drawer-menu').getByRole('button', { name: 'Settings', exact: true }).click(); await settle()
  await page.reload(); await ready(); await settle()
  await button('Back').click(); await page.locator('.keyboard').waitFor(); await settle()
  assert.equal(await page.locator('.menu-toggle').evaluate(el => el === document.activeElement), true)
  // Real touch input, including a partial drag, native vertical scrolling and cancellation.
  await openDrawer(); await page.screenshot({ path: `${output}/drawer-dark.png` })
  await touch('touchStart', 260, 120); await touch('touchMove', 230, 121); await page.waitForTimeout(90)
  const tracked = await page.locator('.app-drawer').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41)
  assert.ok(tracked < -15 && tracked > -55, `drawer follows finger: ${tracked}`)
  await touch('touchCancel'); await settle()
  assert.equal(await page.locator('.app-drawer').evaluate(el => Math.round(new DOMMatrix(getComputedStyle(el).transform).m41)), 0)
  await touch('touchStart', 260, 120); await touch('touchMove', 220, 122); await page.waitForTimeout(220); await touch('touchEnd'); await settle()
  assert.equal(await page.locator('.app-drawer[open]').count(), 1)
  await touch('touchStart', 260, 120); await touch('touchMove', 230, 121); await touch('touchMove', 160, 122); await touch('touchMove', 80, 123); await touch('touchEnd'); await settle()
  assert.equal(await page.locator('.app-drawer').count(), 0)
  assert.equal(await page.locator('.menu-toggle').evaluate(el => el === document.activeElement), true)
  assert.deepEqual((await state()).session, saved.session)
  await openDrawer(); await page.goBack(); await settle()
  assert.equal(await page.locator('.app-drawer').count(), 0)
  await openDrawer(); await page.mouse.click(400, 350); await settle()
  assert.equal(await page.locator('.app-drawer').count(), 0)
  await openDrawer()
  await touch('touchStart', 260, 120); await touch('touchMove', 220, 120)
  await page.setViewportSize({ width: 360, height: 640 }); await touch('touchCancel'); await settle()
  assert.equal(await page.locator('.app-drawer').evaluate(el => Math.round(new DOMMatrix(getComputedStyle(el).transform).m41)), 0)
  await touch('touchStart', 260, 470); await touch('touchMove', 258, 430); await touch('touchMove', 255, 250); await touch('touchEnd'); await settle()
  assert.equal(await page.locator('.app-drawer[open]').count(), 1)
  assert.equal(await page.locator('.app-drawer').evaluate(el => Math.round(new DOMMatrix(getComputedStyle(el).transform).m41)), 0)
  assert.ok(await page.locator('.app-drawer').evaluate(el => el.scrollTop) > 0)
  await page.locator('.app-drawer').evaluate(el => { el.scrollTop = 0 })
  await button('Close dialog').click(); await settle()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDrawer(); await button('Close dialog').click()
  assert.equal(await page.locator('.app-drawer').count(), 0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  console.log('PASS: first/returning launch, practice, all appearances, restart safety, durable resume, swipe/cancel/scroll/resize/backdrop/Back/reduced motion')

  const sizes = [[320, 568], [360, 640], [360, 800], [412, 915], [480, 960], [915, 412]]
  for (const appearance of ['Light', 'Dark']) {
    await page.setViewportSize({ width: 412, height: 915 }); await theme(appearance)
    await openDrawer(); await page.screenshot({ path: `${output}/drawer-${appearance.toLowerCase()}.png` })
    await page.locator('.drawer-menu').getByRole('button', { name: 'How to play', exact: true }).click(); await settle()
    await page.screenshot({ path: `${output}/tutorial-${appearance.toLowerCase()}.png` }); await button('Back').click(); await settle()
    await button('Hint').click(); await settle(); await page.screenshot({ path: `${output}/hint-${appearance.toLowerCase()}.png` }); await button('Cancel').click()
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height }); await fitGame(`${appearance} ${width}x${height}`)
      await page.screenshot({ path: `${output}/game-${appearance.toLowerCase()}-${width}x${height}.png` })
    }
  }
  // Long quotes in both alphabets, enlarged UI text, and scrollable secondary screens.
  for (const language of ['en', 'ru']) {
    await page.evaluate(async locale => {
      const game = (await import('/src/stores/game.ts')).useGameStore()
      game.setLanguage(locale)
      const longest = [...game.collection].sort((a, b) => b.quote.text.length - a.quote.text.length)[0]
      game.switchPuzzle(longest.quote.id)
      document.documentElement.style.fontSize = '200%'
    }, language)
    for (const [width, height] of [[360, 640], [412, 915], [915, 412]]) {
      await page.setViewportSize({ width, height }); await fitGame(`${language} 200% ${width}x${height}`)
    }
    await page.setViewportSize({ width: 360, height: 640 })
    await page.locator('.menu-toggle').click(); await settle()
    await page.locator('.drawer-menu').getByRole('button', { name: language === 'en' ? 'Settings' : 'Настройки', exact: true }).click(); await settle()
    await noHorizontalOverflow()
    assert.equal(await page.locator('.app-screen .appearance-control').evaluate(el => el.scrollWidth > el.clientWidth), false)
    await page.screenshot({ path: `${output}/settings-${language}-200-percent.png` })
    await page.locator('.screen-back').click(); await settle()
  }
  await page.evaluate(async () => { document.documentElement.style.fontSize = ''; (await import('/src/stores/game.ts')).useGameStore().setLanguage('en') })
  await page.setViewportSize({ width: 1440, height: 1000 }); await settle()
  await openDrawer()
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('.app-drawer')), true)
  }
  await page.keyboard.press('Escape'); await settle()
  assert.equal(await page.locator('.app-drawer').count(), 0)
  await page.screenshot({ path: `${output}/desktop-dark.png` })
  await page.setViewportSize({ width: 320, height: 568 })
  await openDrawer(); await page.locator('.drawer-menu').getByRole('button', { name: 'Main menu', exact: true }).click(); await settle()
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' }); await settle()
  await noHorizontalOverflow(); await page.screenshot({ path: `${output}/home-320x568-200-percent.png` })
  await button('How to play').click(); await settle(); await noHorizontalOverflow()
  await page.screenshot({ path: `${output}/tutorial-320x568-200-percent.png` })
  await button('Back').click(); await settle(); await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  const legacy = await context.newPage()
  await legacy.goto(base + '/#/settings'); await legacy.locator('.app-shell:not(.is-loading)').waitFor()
  assert.equal(new URL(legacy.url()).pathname, '/settings'); assert.equal(new URL(legacy.url()).hash, '')
  await legacy.close()
  assert.deepEqual(errors, [])
  console.log('PASS: both themes at 6 mobile sizes, EN/RU long quotes at 200%, radio reflow, desktop focus trap/Escape; no runtime errors')
} finally { await browser.close() }
