import { alphabetFor } from '../engine/alphabet'
import type { PuzzleLanguage } from '../engine/alphabet'
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

const russianKeys = Object.fromEntries([
  ...[...'QWERTYUIOP'].map((letter, i) => [`Key${letter}`, 'ЙЦУКЕНГШЩЗ'[i]]),
  ...[...'ASDFGHJKL'].map((letter, i) => [`Key${letter}`, 'ФЫВАПРОЛД'[i]]),
  ...[...'ZXCVBNM'].map((letter, i) => [`Key${letter}`, 'ЯЧСМИТЬ'[i]]),
  ['BracketLeft', 'Х'], ['BracketRight', 'Ъ'], ['Semicolon', 'Ж'], ['Quote', 'Э'], ['Comma', 'Б'], ['Period', 'Ю'], ['Backquote', 'Ё'],
])
/** Interpret letters for the puzzle alphabet; shortcuts retain their normal physical codes. */
export function keyboardAction(event: KeyInput, language: PuzzleLanguage = 'en'): KeyboardAction | null {
  if (event.isComposing || event.altKey) return null
  const shortcutLetter = /^[a-z]$/i.test(event.key) ? event.key.toUpperCase() : /^Key[A-Z]$/.test(event.code ?? '') ? event.code!.slice(3) : null
  if (event.ctrlKey || event.metaKey) {
    if (shortcutLetter === 'Z') return { type: 'history', direction: event.shiftKey ? 'redo' : 'undo' }
    if (shortcutLetter === 'Y') return { type: 'history', direction: 'redo' }
    return null
  }
  const key = event.key.toUpperCase()
  const letter = key.length === 1 && alphabetFor(language).includes(key) ? key
    : language === 'ru' && event.key.length === 1 ? russianKeys[event.code ?? '']
    : language === 'en' && /^\p{L}$/u.test(event.key) && /^Key[A-Z]$/.test(event.code ?? '') ? event.code!.slice(3) : null
  if (letter) return { type: 'letter', letter }
  if (/^\p{L}$/u.test(event.key)) return { type: 'layout-help' }
  if (event.key === 'Enter') return { type: 'next' }
  if (event.key === 'Backspace' || event.key === 'Delete') return { type: 'erase' }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    return { type: 'navigate', key: event.key as NavigationKey }
  }
  return null
}
