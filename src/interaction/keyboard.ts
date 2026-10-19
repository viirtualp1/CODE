import type { NavigationKey } from './navigation'

export interface KeyInput {
  key: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  isComposing?: boolean
}
export type KeyboardAction =
  | { type: 'letter'; letter: string }
  | { type: 'erase' }
  | { type: 'next' }
  | { type: 'layout-help' }
  | { type: 'navigate'; key: NavigationKey }
  | { type: 'history'; direction: 'undo' | 'redo' }

/** Keep Latin layouts semantic; use English QWERTY positions for non-Latin letters. */
export function keyboardAction(event: KeyInput): KeyboardAction | null {
  if (event.isComposing || event.altKey) return null
  const letter = /^[a-z]$/i.test(event.key) ? event.key.toUpperCase()
    : /^\p{L}$/u.test(event.key) && /^Key[A-Z]$/.test(event.code ?? '') ? event.code!.slice(3) : null
  if (event.ctrlKey || event.metaKey) {
    if (letter === 'Z') return { type: 'history', direction: event.shiftKey ? 'redo' : 'undo' }
    if (letter === 'Y') return { type: 'history', direction: 'redo' }
    return null
  }
  if (letter) return { type: 'letter', letter }
  if (/^\p{L}$/u.test(event.key)) return { type: 'layout-help' }
  if (event.key === 'Enter') return { type: 'next' }
  if (event.key === 'Backspace' || event.key === 'Delete') return { type: 'erase' }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    return { type: 'navigate', key: event.key as NavigationKey }
  }
  return null
}
