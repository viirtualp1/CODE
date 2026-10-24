import type { Theme } from './storage'

// A synchronous presentation cache; IndexedDB retains the full preferences record.
export const appearanceKey = 'code-appearance'
export function isTheme(value: unknown): value is Theme { return value === 'system' || value === 'dark' || value === 'light' }
export function readAppearance(): Theme {
  try { const value = localStorage.getItem(appearanceKey); return isTheme(value) ? value : 'system' } catch { return 'system' }
}
export function cacheAppearance(value: Theme) {
  try { localStorage.setItem(appearanceKey, value) } catch { /* IndexedDB remains available when localStorage is denied. */ }
}
export function resolvedAppearance(preference: Theme, systemDark: boolean): 'dark' | 'light' {
  return preference === 'system' ? systemDark ? 'dark' : 'light' : preference
}
export function connectAppearance(preference: () => Theme, media: MediaQueryList, root = document.documentElement) {
  function apply() {
    root.dataset.theme = resolvedAppearance(preference(), media.matches)
    const color = getComputedStyle(root).getPropertyValue('--paper').trim()
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }
  media.addEventListener('change', apply)
  apply()
  return { apply, dispose: () => media.removeEventListener('change', apply) }
}
