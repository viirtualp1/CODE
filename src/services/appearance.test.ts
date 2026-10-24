import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { appearanceKey, cacheAppearance, connectAppearance, readAppearance, resolvedAppearance } from './appearance'

const values = new Map<string, string>()
beforeEach(() => {
  values.clear()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) })
})
afterEach(() => vi.unstubAllGlobals())
describe('appearance startup and runtime', () => {
  it('defaults missing/invalid preferences to System and survives denied storage', () => {
    expect(readAppearance()).toBe('system')
    values.set(appearanceKey, 'sepia'); expect(readAppearance()).toBe('system')
    cacheAppearance('dark'); expect(readAppearance()).toBe('dark')
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied') }, setItem: () => { throw new Error('Denied') } })
    expect(readAppearance()).toBe('system'); expect(() => cacheAppearance('light')).not.toThrow()
  })
  it('follows device changes only in System, updates the browser chrome and removes its listener', () => {
    let preference: 'system' | 'dark' | 'light' = 'system'
    let listener = () => {}
    const remove = vi.fn()
    const media = { matches: false, addEventListener: (_: string, fn: () => void) => { listener = fn }, removeEventListener: remove } as unknown as MediaQueryList
    const root = { dataset: {} } as HTMLElement
    const meta = { setAttribute: vi.fn() }
    vi.stubGlobal('document', { querySelector: () => meta })
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => root.dataset.theme === 'dark' ? '#191b1a' : '#f6f5f1' }))
    const appearance = connectAppearance(() => preference, media, root)
    expect(root.dataset.theme).toBe('light')
    Object.assign(media, { matches: true }); listener(); expect(root.dataset.theme).toBe('dark')
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', '#191b1a')
    preference = 'light'; appearance.apply(); listener(); expect(root.dataset.theme).toBe('light')
    preference = 'dark'; Object.assign(media, { matches: false }); listener(); expect(root.dataset.theme).toBe('dark')
    preference = 'system'; appearance.apply(); expect(root.dataset.theme).toBe('light')
    appearance.dispose(); expect(remove).toHaveBeenCalledWith('change', listener)
  })
  it.each(['system', 'dark', 'light'] as const)('applies %s before the app bundle runs', preference => {
    cacheAppearance(preference)
    const papers = [...readFileSync(new URL('../styles/_tokens.scss', import.meta.url), 'utf8').matchAll(/--paper: (#[a-f0-9]{6});/g)].map(match => match[1])
    const script = readFileSync(new URL('../../index.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1]!
    for (const systemDark of [true, false]) {
      const root = { dataset: { theme: '' } }, meta = { content: '' }
      runInNewContext(script, { localStorage, matchMedia: () => ({ matches: systemDark }), document: { documentElement: root, querySelector: () => meta } })
      expect(root.dataset.theme).toBe(resolvedAppearance(preference, systemDark))
      expect(meta.content).toBe(root.dataset.theme === 'dark' ? papers[1] : papers[0])
    }
  })
})
