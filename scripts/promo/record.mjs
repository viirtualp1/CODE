// Records the 16:9 YouTube promo from real gameplay: outputs/CODE-promo.mp4 and a thumbnail.
// Run against `npm run dev -- --port 5178`; needs Playwright and ffmpeg.
import { resolve } from 'node:path'
import { base, keepPainting, launch, output, solveLetters } from './capture.mjs'

const { page, start, finish } = await launch('video', { width: 1280, height: 720, scale: 1.5 })
const wait = ms => page.waitForTimeout(ms)

// ---------- injected promo layer ----------
const PROMO_CSS = `
#promo-cursor{position:fixed;inset:auto;left:0;top:0;margin:0;padding:0;border:0;background:none;overflow:visible;width:22px;height:22px;z-index:2147483647;pointer-events:none;transition:opacity .3s;opacity:0}
#promo-cursor svg{display:block;filter:drop-shadow(0 1px 2px #0003)}
#promo-cursor.down svg{transform:scale(.86);transform-origin:2px 2px;transition:transform .08s}
#promo-caption{position:fixed;left:0;right:0;bottom:38px;z-index:2147483600;pointer-events:none;text-align:center;font:500 21px/1.3 var(--sans);letter-spacing:.01em;color:var(--ink)}
#promo-caption span{display:inline-block;opacity:0;transform:translateY(6px);transition:opacity .45s ease,transform .45s ease}
#promo-caption span.on{opacity:1;transform:none}
#promo-caption em{font-style:normal;color:var(--accent)}
.promo-card{position:fixed;inset:0;z-index:2147483500;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f6f5f1;color:#252724;font-family:var(--sans);transition:opacity .7s ease;pointer-events:none}
.promo-card.hide{opacity:0}
.pc-cells{display:flex;gap:14px}
.pc-cell{display:flex;flex-direction:column;align-items:center;width:84px;transition:width .7s cubic-bezier(.6,0,.2,1),gap .7s}
.pc-letter{height:104px;font:600 92px/104px var(--sans);color:#4e623d;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s,color .6s,letter-spacing .7s}
.pc-letter.on{opacity:1;transform:none}
.pc-rule{width:100%;height:2px;background:#d7dad3;margin-top:4px;transition:opacity .5s,background .2s}
.pc-num{margin-top:10px;font:500 22px var(--sans);color:#62665f;font-variant-numeric:tabular-nums;transition:opacity .5s}
.pc-cell.active .pc-rule{background:#4e623d}
.pc-cell.active{background:#e5ebdf}
.pc-done .pc-cell{background:transparent!important}
.pc-done .pc-rule,.pc-done .pc-num{opacity:0}
.pc-done .pc-letter{color:#252724}
.pc-done .pc-cells{gap:0}
.pc-done .pc-cell{width:66px}
.pc-dot{width:0;overflow:visible;display:flex;justify-content:flex-start;align-items:flex-start;transition:width .7s cubic-bezier(.6,0,.2,1)}
.pc-dot i{display:block;flex:none;width:12px;height:12px;background:#4e623d;margin-top:80px;opacity:0;transform:scale(.4);transition:opacity .3s .5s,transform .3s .5s}
.pc-done .pc-dot{width:20px}
.pc-done .pc-dot i{opacity:1;transform:none}
.pc-tag{margin-top:34px;font:500 22px var(--sans);color:#62665f;opacity:0;transform:translateY(6px);transition:opacity .6s,transform .6s}
.pc-tag.on{opacity:1;transform:none}
.pc-title{font:600 58px/1.1 var(--sans);letter-spacing:-.02em;text-align:center;opacity:0;transform:translateY(8px);transition:opacity .6s,transform .6s}
.pc-sub{margin-top:18px;font:400 26px var(--serif);font-style:italic;color:#62665f;opacity:0;transform:translateY(8px);transition:opacity .6s .25s,transform .6s .25s}
.pc-on .pc-title,.pc-on .pc-sub,.pc-on .pc-list{opacity:1;transform:none}
.pc-title b{color:#4e623d;font-weight:600}
.pc-list{margin-top:40px;display:flex;gap:28px;font:500 19px var(--sans);color:#62665f;opacity:0;transform:translateY(8px);transition:opacity .6s .5s,transform .6s .5s}
.pc-list span+span::before{content:'';display:inline-block;width:5px;height:5px;background:#4e623d;margin:0 28px 4px 0;vertical-align:middle}
.pc-logo{font:600 120px/1 var(--sans);letter-spacing:-.06em;opacity:0;transform:translateY(8px);transition:opacity .7s,transform .7s}
.pc-logo i{display:inline-block;width:15px;height:15px;background:#4e623d;margin-left:6px}
.pc-on .pc-logo{opacity:1;transform:none}
`

async function inject () {
  await page.addStyleTag({ content: PROMO_CSS })
  await page.evaluate(() => {
    const c = document.createElement('div')
    c.id = 'promo-cursor'
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14.5 9.2-6.4 1.2 3.7 7.1-2.6 1.3-3.7-7.2L3.6 18z" fill="#1d201c" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'
    c.setAttribute('popover', 'manual')
    document.body.append(c)
    c.showPopover()
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)` }, true)
    addEventListener('mousedown', () => c.classList.add('down'), true)
    addEventListener('mouseup', () => c.classList.remove('down'), true)
    const cap = document.createElement('div')
    cap.id = 'promo-caption'
    document.body.append(cap)
  })
  await page.evaluate(keepPainting)
}

const cursor = (on) => page.evaluate((on) => { document.getElementById('promo-cursor').style.opacity = on ? '1' : '0' }, on)
let mouse = { x: 640, y: 560 }
async function glide (x, y, ms = 450) {
  const steps = Math.max(8, Math.round(ms / 16))
  const from = { ...mouse }
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e)
    await wait(ms / steps)
  }
  mouse = { x, y }
}
async function clickAt (locator, ms) {
  const box = locator.boundingBox ? await locator.boundingBox() : locator
  await glide(box.x + box.width / 2, box.y + box.height / 2, ms)
  await page.mouse.down()
  await wait(70)
  await page.mouse.up()
}

async function caption (html) {
  await page.evaluate(async (html) => {
    const cap = document.getElementById('promo-caption')
    const old = cap.querySelector('span')
    if (old) { old.classList.remove('on'); await new Promise(r => setTimeout(r, 380)); old.remove() }
    if (!html) return
    const s = document.createElement('span')
    s.innerHTML = html
    cap.append(s)
    requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('on')))
  }, html)
}

async function card (id, html) {
  await page.evaluate(({ id, html }) => {
    const d = document.createElement('div')
    d.className = 'promo-card hide'
    d.id = id
    d.innerHTML = html
    document.body.append(d)
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.remove('hide')))
  }, { id, html })
}
const cls = (id, add, name) => page.evaluate(({ id, add, name }) => document.getElementById(id).classList[add ? 'add' : 'remove'](name), { id, add, name })
async function dropCard (id) {
  await cls(id, true, 'hide')
  await wait(750)
  await page.evaluate((id) => document.getElementById(id).remove(), id)
}

// ---------- solving ----------
async function solve (text, pace) {
  const letters = solveLetters(text)
  for (let guard = 0; guard < 60; guard++) {
    const idx = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.cipher-cell')]
      const blank = cells.some(c => !c.querySelector('.cell-letter').textContent.trim())
      if (!blank || !document.querySelector('.keyboard .letter-key:not([disabled])')) return -1
      return cells.findIndex(c => c.dataset.active === 'true')
    })
    if (idx < 0) return
    const letter = letters[idx]
    const key = await page.evaluate((letter) => {
      const k = [...document.querySelectorAll('.keyboard .letter-key')].find(b => b.firstChild.textContent.trim().normalize('NFC') === letter.normalize('NFC'))
      const r = k.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }, letter)
    await clickAt(key, pace(guard).move)
    await wait(pace(guard).after)
  }
}

// ================= SCENES =================
await page.goto(base)
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)
await inject()

// Intro: cipher cells decode into the logo
await card('intro', `
  <div class="pc-cells-wrap" id="intro-wrap" style="display:flex;flex-direction:column;align-items:center">
    <div class="pc-cells" style="display:flex;align-items:flex-start">
      ${[['C', 17], ['O', 4], ['D', 22], ['E', 9]].map(([l, num], i) => `<div class="pc-cell" id="ic${i}"><div class="pc-letter">${l}</div><div class="pc-rule"></div><div class="pc-num">${num}</div></div>`).join('')}
      <div class="pc-dot"><i></i></div>
    </div>
    <div class="pc-tag" id="intro-tag">A minimalist cryptogram game</div>
  </div>`)
await page.evaluate(() => {
  // cards start visible for the very first frame
  const d = document.getElementById('intro'); d.style.transition = 'none'; d.classList.remove('hide'); d.offsetHeight; d.style.transition = ''
})
await start()
await wait(700)
for (let i = 0; i < 4; i++) {
  await page.evaluate((i) => {
    document.querySelectorAll('.pc-cell').forEach(c => c.classList.remove('active'))
    document.getElementById('ic' + i).classList.add('active')
  }, i)
  await wait(260)
  await page.evaluate((i) => document.querySelector(`#ic${i} .pc-letter`).classList.add('on'), i)
  await wait(300)
}
await page.evaluate(() => document.querySelectorAll('.pc-cell').forEach(c => c.classList.remove('active')))
await wait(350)
await cls('intro-wrap', true, 'pc-done')
await wait(1000)
await cls('intro-tag', true, 'on')
await wait(1700)
await page.evaluate(() => { const w = document.getElementById('intro-wrap'); w.style.transition = 'opacity .45s ease'; w.style.opacity = '0' })
await wait(500)
await dropCard('intro')

// Home -> Play
await page.mouse.move(mouse.x, mouse.y)
await cursor(true)
await wait(500)
await clickAt(page.getByRole('button', { name: 'Play', exact: true }), 750)
await wait(500)
await page.mouse.move(mouse.x, mouse.y)

// Gameplay: Austen, showing every control
const cursorOnTop = () => page.evaluate(() => { const c = document.getElementById('promo-cursor'); c.hidePopover(); c.showPopover() })
const keyRect = (letter) => page.evaluate((letter) => {
  const k = [...document.querySelectorAll('.keyboard .letter-key')].find(b => b.firstChild.textContent.trim() === letter)
  const r = k.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}, letter)
const press = async (letter, move = 450, after = 450) => { await clickAt(await keyRect(letter), move); await wait(after) }
const button = async (name, move = 650, after = 700) => { await clickAt(page.getByRole('button', { name, exact: true }), move); await wait(after) }

await caption('Every number hides a <em>letter</em>')
await wait(1500)
await press('H', 600, 700)
await caption('Crack one — <em>every match</em> fills in')
await press('I', 520, 550)
await press('S', 480, 650)
await press('W', 480, 450)
await press('O', 450, 800)
await caption('Changed your mind? <em>Undo</em> &amp; <em>redo</em>')
await button('Undo last move', 750, 900)
await button('Redo last move', 450, 1000)
await caption('<em>Check</em> only when you ask')
await button('Check', 800, 900)
await page.screenshot({ path: resolve(output, 'CODE-promo-thumbnail.jpg'), quality: 92 })
await wait(1500)
await caption('<em>Erase</em> the mistake')
await clickAt(page.locator('.erase-key'), 750)
await wait(1100)
await caption('Stuck? Reveal a <em>letter</em>')
await button('Hint', 800, 600)
await cursorOnTop()
await button('Reveal letter', 600, 1100)
await caption('No timers. No ads. <em>Just the code.</em>')
await button('Select next unanswered number', 600, 450)
await solve('There is no charm equal to tenderness of heart.', (i) => i < 2 ? { move: 380, after: 280 } : { move: 280, after: 160 })
await cursor(false)
await wait(400)
await caption('')
await wait(2400)
await caption('<em>Light</em> &amp; <em>dark</em>')
await wait(500)
await page.emulateMedia({ colorScheme: 'dark' })
await wait(2600)
await caption('')

// Card: content
await card('content', `<div class="pc-title">200 classic quotes</div><div class="pc-sub">Austen, Carroll, Conan Doyle, Twain &amp; more</div><div class="pc-list"><span>Easy · Medium · Hard</span><span>Works offline</span></div>`)
await wait(750)
await cls('content', true, 'pc-on')
await wait(2800)

// Outro
await card('outro', `<div class="pc-logo">CODE<i></i></div><div class="pc-sub" style="font-size:30px;margin-top:26px">Crack the code.</div><div class="pc-list" style="margin-top:46px;font-size:22px;color:#252724"><span>crackthecode.quest</span></div><div class="pc-list" style="margin-top:22px"><span>Free</span><span>No ads</span><span>No account</span><span>Phone &amp; desktop</span></div>`)
await wait(750)
await cls('outro', true, 'pc-on')
await wait(4000)
await finish('CODE-promo.mp4')
