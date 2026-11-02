// Records the vertical Shorts promo: the real phone layout in an iframe, captions above it.
// Writes outputs/CODE-promo-shorts.mp4. Run against `npm run dev -- --port 5178`; needs Playwright and ffmpeg.
import { base, keepPainting, launch, solveLetters } from './capture.mjs'

const W = 432
const H = 768
const TOP = 140
const APP_H = 520
const { page, start, finish } = await launch('shorts', { width: W, height: H, scale: 2.5 })
const wait = ms => page.waitForTimeout(ms)

// ---------- wrapper document ----------
const font = (family, file, weight, style = 'normal') => `@font-face{font-family:'${family}';src:url('/node_modules/@fontsource/${family.toLowerCase()}/files/${file}') format('woff2');font-weight:${weight};font-style:${style}}`
const WRAPPER = `<!doctype html><html><head><meta charset="utf-8"><style>
${font('Manrope', 'manrope-latin-500-normal.woff2', 500)}
${font('Manrope', 'manrope-latin-600-normal.woff2', 600)}
${font('Newsreader', 'newsreader-latin-400-italic.woff2', 400, 'italic')}
:root{--paper:#f6f5f1;--ink:#252724;--muted:#62665f;--accent:#4e623d;--sans:'Manrope',sans-serif;--serif:'Newsreader',Georgia,serif}
@media (prefers-color-scheme: dark){:root{--paper:#191b1a;--ink:#edf0e9;--muted:#afb5ab;--accent:#b4c99e}}
html,body{margin:0;height:100%;background:var(--paper);overflow:hidden;transition:background .3s}
#app{position:fixed;left:0;top:${TOP}px;width:${W}px;height:${APP_H}px;border:0}
#caption{position:fixed;left:0;right:0;top:0;height:${TOP}px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 24px;box-sizing:border-box;font:600 27px/1.22 var(--sans);letter-spacing:-.01em;color:var(--ink)}
#caption span{opacity:0;transform:translateY(8px);transition:opacity .45s ease,transform .45s ease}
#caption span.on{opacity:1;transform:none}
#caption em{font-style:normal;color:var(--accent)}
.tap{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:var(--accent);opacity:.35;pointer-events:none;z-index:50;animation:tap .5s ease-out forwards}
@keyframes tap{from{transform:scale(.35);opacity:.45}to{transform:scale(1.15);opacity:0}}
.card{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f6f5f1;color:#252724;font-family:var(--sans);transition:opacity .7s ease;padding:0 24px;box-sizing:border-box}
.card.hide{opacity:0}
.cells{display:flex;align-items:flex-start;gap:10px}
.cell{display:flex;flex-direction:column;align-items:center;width:64px;transition:width .7s cubic-bezier(.6,0,.2,1)}
.letter{height:80px;font:600 70px/80px var(--sans);color:#4e623d;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s,color .6s}
.letter.on{opacity:1;transform:none}
.rule{width:100%;height:2px;background:#d7dad3;margin-top:4px;transition:opacity .5s,background .2s}
.num{margin-top:8px;font:500 18px var(--sans);color:#62665f;transition:opacity .5s}
.cell.active{background:#e5ebdf}
.cell.active .rule{background:#4e623d}
.done .cell{background:transparent!important;width:50px}
.done .rule,.done .num{opacity:0}
.done .letter{color:#252724}
.done .cells{gap:0}
.dot{width:0;overflow:visible;display:flex;transition:width .7s cubic-bezier(.6,0,.2,1)}
.dot i{display:block;flex:none;width:10px;height:10px;background:#4e623d;margin-top:61px;opacity:0;transform:scale(.4);transition:opacity .3s .5s,transform .3s .5s}
.done .dot{width:14px}
.done .dot i{opacity:1;transform:none}
.tag{margin-top:26px;font:500 19px var(--sans);color:#62665f;opacity:0;transform:translateY(6px);transition:opacity .6s,transform .6s}
.tag.on{opacity:1;transform:none}
.title{font:600 44px/1.12 var(--sans);letter-spacing:-.02em;text-align:center}
.sub{margin-top:16px;font:italic 400 22px/1.3 var(--serif);color:#62665f;text-align:center}
.list{margin-top:30px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px 22px;font:500 17px var(--sans);color:#62665f}
.list span+span::before{content:'';display:inline-block;width:5px;height:5px;background:#4e623d;margin:0 22px 3px 0;vertical-align:middle}
.card .title,.card .sub,.card .list,.card .logo{opacity:0;transform:translateY(8px);transition:opacity .6s,transform .6s}
.card .sub{transition-delay:.2s}
.card .list{transition-delay:.4s}
.card.on .title,.card.on .sub,.card.on .list,.card.on .logo{opacity:1;transform:none}
.logo{font:600 96px/1 var(--sans);letter-spacing:-.06em}
.logo i{display:inline-block;width:12px;height:12px;background:#4e623d;margin-left:5px}
</style></head><body>
<div id="caption"></div>
<iframe id="app" src="/"></iframe>
</body></html>`

await page.goto(base)
await page.evaluate((html) => { document.open(); document.write(html); document.close() }, WRAPPER)
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)
const app = page.frames().find(f => f !== page.mainFrame())
await app.waitForSelector('.home-play')
await wait(500)

await page.evaluate(keepPainting)

// ---------- helpers ----------
async function caption (html) {
  await page.evaluate(async (html) => {
    const cap = document.getElementById('caption')
    const old = cap.querySelector('span')
    if (old) { old.classList.remove('on'); await new Promise(r => setTimeout(r, 380)); old.remove() }
    if (!html) return
    const s = document.createElement('span')
    s.innerHTML = html
    cap.append(s)
    requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('on')))
  }, html)
}
async function card (id, html, visible = false) {
  await page.evaluate(({ id, html, visible }) => {
    const d = document.createElement('div')
    d.className = 'card' + (visible ? '' : ' hide')
    d.id = id
    d.innerHTML = html
    document.body.append(d)
    if (!visible) requestAnimationFrame(() => requestAnimationFrame(() => d.classList.remove('hide')))
  }, { id, html, visible })
}
const cls = (id, add, name) => page.evaluate(({ id, add, name }) => document.getElementById(id).classList[add ? 'add' : 'remove'](name), { id, add, name })
async function dropCard (id) {
  await cls(id, true, 'hide')
  await wait(750)
  await page.evaluate((id) => document.getElementById(id).remove(), id)
}
// Rect of an element inside the app iframe, in page coordinates.
async function appRect (fn, arg) {
  const r = await app.evaluate(fn, arg)
  return r && { x: r.x, y: r.y + TOP, width: r.width, height: r.height }
}
async function tap (r) {
  const x = r.x + r.width / 2
  const y = r.y + r.height / 2
  await page.evaluate(({ x, y }) => {
    const t = document.createElement('div')
    t.className = 'tap'
    t.style.left = x + 'px'
    t.style.top = y + 'px'
    document.body.append(t)
    setTimeout(() => t.remove(), 600)
  }, { x, y })
  await page.mouse.click(x, y, { delay: 60 })
  await page.mouse.move(W / 2, H - 4)
}

async function solve (text, pace) {
  const letters = solveLetters(text)
  for (let i = 0; i < 60; i++) {
    const idx = await app.evaluate(() => {
      const cells = [...document.querySelectorAll('.cipher-cell')]
      const blank = cells.some(c => !c.querySelector('.cell-letter').textContent.trim())
      if (!blank || !document.querySelector('.keyboard .letter-key:not([disabled])')) return -1
      return cells.findIndex(c => c.dataset.active === 'true')
    })
    if (idx < 0) return
    const key = await appRect((letter) => {
      const k = [...document.querySelectorAll('.keyboard .letter-key')].find(b => b.firstChild.textContent.trim().normalize('NFC') === letter.normalize('NFC'))
      const r = k.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }, letters[idx])
    await tap(key)
    await wait(pace(i))
  }
}

// ================= SCENES =================
await card('intro', `
  <div id="intro-wrap" style="display:flex;flex-direction:column;align-items:center">
    <div class="cells">
      ${[['C', 17], ['O', 4], ['D', 22], ['E', 9]].map(([l, num], i) => `<div class="cell" id="ic${i}"><div class="letter">${l}</div><div class="rule"></div><div class="num">${num}</div></div>`).join('')}
      <div class="dot"><i></i></div>
    </div>
    <div class="tag" id="intro-tag">A minimalist cryptogram game</div>
  </div>`, true)
await start()
await wait(600)
for (let i = 0; i < 4; i++) {
  await page.evaluate((i) => {
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('active'))
    document.getElementById('ic' + i).classList.add('active')
  }, i)
  await wait(230)
  await page.evaluate((i) => document.querySelector(`#ic${i} .letter`).classList.add('on'), i)
  await wait(270)
}
await page.evaluate(() => document.querySelectorAll('.cell').forEach(c => c.classList.remove('active')))
await wait(300)
await cls('intro-wrap', true, 'done')
await wait(1000)
await cls('intro-tag', true, 'on')
await wait(1500)
await page.evaluate(() => { const w = document.getElementById('intro-wrap'); w.style.transition = 'opacity .45s ease'; w.style.opacity = '0' })
await wait(500)
await dropCard('intro')

// Home -> Play
await wait(300)
await tap(await appRect(() => { const r = document.querySelector('.home-play').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }))
await wait(400)

// Gameplay: Austen, showing every control
const keyRect = (letter) => appRect((letter) => {
  const k = [...document.querySelectorAll('.keyboard .letter-key')].find(b => b.firstChild.textContent.trim() === letter)
  const r = k.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
}, letter)
const press = async (letter, after = 550) => { await tap(await keyRect(letter)); await wait(after) }
const button = async (name, after = 800) => { await tap(await app.getByRole('button', { name, exact: true }).boundingBox()); await wait(after) }

await caption('Every number<br>hides a <em>letter</em>')
await wait(1500)
await press('H', 900)
await caption('Crack one —<br><em>every match</em> fills in')
await press('I', 650)
await press('S', 750)
await press('W', 550)
await press('O', 900)
await caption('Changed your mind?<br><em>Undo</em> &amp; <em>redo</em>')
await wait(400)
await button('Undo last move', 1000)
await button('Redo last move', 1100)
await caption('<em>Check</em> only<br>when you ask')
await wait(400)
await button('Check', 2400)
await caption('<em>Erase</em> the mistake')
await wait(400)
await tap(await app.locator('.erase-key').boundingBox())
await wait(1200)
await caption('Stuck?<br>Reveal a <em>letter</em>')
await wait(400)
await button('Hint', 900)
await button('Reveal letter', 1200)
await caption('No timers. No ads.<br><em>Just the code.</em>')
await button('Select next unanswered number', 500)
await solve('There is no charm equal to tenderness of heart.', (i) => i < 2 ? 450 : 280)
await wait(300)
await caption('')
await wait(2200)
await caption('<em>Light</em> &amp; <em>dark</em>')
await wait(500)
await page.emulateMedia({ colorScheme: 'dark' })
await wait(2600)
await caption('')

// Card: content
await card('content', `<div class="title">200 classic<br>quotes</div><div class="sub">Austen, Carroll,<br>Conan Doyle, Twain &amp; more</div><div class="list"><span>Easy</span><span>Medium</span><span>Hard</span></div><div class="list" style="margin-top:12px"><span>Works offline</span></div>`)
await wait(750)
await cls('content', true, 'on')
await wait(2800)

// Outro
await card('outro', `<div class="logo">CODE<i></i></div><div class="sub" style="font-size:26px;margin-top:22px">Crack the code.</div><div class="list" style="margin-top:38px;font-size:20px;color:#252724"><span>crackthecode.quest</span></div><div class="list" style="margin-top:18px"><span>Free</span><span>No ads</span><span>No account</span></div>`)
await wait(750)
await cls('outro', true, 'on')
await wait(4000)
await finish('CODE-promo-shorts.mp4')
