// Shared screencast capture for the promo videos. Playwright and ffmpeg are optional
// developer tools; use PLAYWRIGHT_MODULE for a preinstalled runtime without changing app dependencies.
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')

export const base = process.env.PROMO_BASE_URL || 'http://127.0.0.1:5178'
export const output = resolve(process.env.PROMO_OUTPUT || 'outputs')

export async function launch (name, { width, height, scale }) {
  const dir = resolve(output, 'promo-frames', name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  // Screencast ignores the context scale unless the browser itself is forced to it.
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL, args: [`--force-device-scale-factor=${scale}`] })
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: 'light' })
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const cdp = await context.newCDPSession(page)

  const frames = []
  let recording = false
  let pausedTotal = 0
  let rebase = false
  let skip = 0
  let lastT = 0
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    if (!recording) return
    // The first frames after a resume can be stale; drop them and close the paused gap.
    if (rebase && skip++ < 2) return
    if (rebase) { skip = 0; pausedTotal = metadata.timestamp - (lastT + 1 / 30); rebase = false }
    lastT = metadata.timestamp - pausedTotal
    const file = resolve(dir, `${String(frames.length).padStart(5, '0')}.jpg`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: lastT })
  })

  async function start () {
    rebase = frames.length > 0
    recording = true
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: width * scale, maxHeight: height * scale, everyNthFrame: 1 })
  }

  async function pause () {
    await page.waitForTimeout(120)
    recording = false
    await cdp.send('Page.stopScreencast')
  }

  async function finish (file) {
    await pause()
    await browser.close()
    // Frames arrive only when the page changes, so each one lasts until the next.
    const list = frames.map((frame, i) => `file '${frame.file}'\nduration ${Math.max((frames[i + 1]?.t ?? frame.t + 0.5) - frame.t, 0.001).toFixed(4)}\n`).join('') + `file '${frames.at(-1).file}'\n`
    writeFileSync(resolve(dir, 'list.txt'), list)
    const target = resolve(output, file)
    const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(dir, 'list.txt'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', target], { stdio: 'inherit' })
    if (result.status !== 0) throw new Error('ffmpeg failed; is it installed?')
    rmSync(dir, { recursive: true, force: true })
    console.log(`${target}: ${(frames.at(-1).t - frames[0].t).toFixed(1)}s`)
  }

  return { page, start, pause, finish }
}

// Screencast skips compositor-only fades; repainting an invisible pixel keeps frames coming.
export function keepPainting () {
  const tick = document.createElement('div')
  tick.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;z-index:2147483647;pointer-events:none'
  document.body.append(tick)
  let odd = false
  const loop = () => { odd = !odd; tick.style.background = odd ? 'rgba(128,128,128,.004)' : 'rgba(128,128,128,.006)'; requestAnimationFrame(loop) }
  loop()
}

export const solveLetters = text => [...text.toUpperCase()].filter(ch => /\p{L}/u.test(ch))
