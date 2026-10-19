import { describe, expect, it } from 'vitest'
import { keyboardAction } from './keyboard'

describe('physical keyboard interpretation', () => {
  it('accepts ordinary lower/uppercase letters without requiring a code value', () => {
    expect(keyboardAction({ key: 'h' })).toEqual({ type: 'letter', letter: 'H' })
    expect(keyboardAction({ key: 'H', code: 'KeyH', shiftKey: true })).toEqual({ type: 'letter', letter: 'H' })
  })
  it('supports Russian macOS input through English physical key positions', () => {
    expect(keyboardAction({ key: 'р', code: 'KeyH' })).toEqual({ type: 'letter', letter: 'H' })
    expect(keyboardAction({ key: 'Щ', code: 'KeyO', shiftKey: true })).toEqual({ type: 'letter', letter: 'O' })
  })
  it('respects Latin AZERTY/QWERTZ/Dvorak characters rather than overriding them', () => {
    expect(keyboardAction({ key: 'a', code: 'KeyQ' })).toEqual({ type: 'letter', letter: 'A' })
    expect(keyboardAction({ key: 'y', code: 'KeyZ' })).toEqual({ type: 'letter', letter: 'Y' })
    expect(keyboardAction({ key: '.', code: 'KeyE' })).toBeNull()
  })
  it('accepts undo/redo in English and Russian without consuming unrelated shortcuts', () => {
    expect(keyboardAction({ key: 'z', metaKey: true })).toEqual({ type: 'history', direction: 'undo' })
    expect(keyboardAction({ key: 'я', code: 'KeyZ', metaKey: true, shiftKey: true })).toEqual({ type: 'history', direction: 'redo' })
    expect(keyboardAction({ key: 'y', ctrlKey: true })).toEqual({ type: 'history', direction: 'redo' })
    expect(keyboardAction({ key: 'r', metaKey: true })).toBeNull()
  })
  it('does not turn composition, dead keys or option shortcuts into guesses', () => {
    expect(keyboardAction({ key: 'р', code: 'KeyH', isComposing: true })).toBeNull()
    expect(keyboardAction({ key: 'Dead', code: 'KeyE' })).toBeNull()
    expect(keyboardAction({ key: 'e', code: 'KeyE', altKey: true })).toBeNull()
    expect(keyboardAction({ key: 'Unidentified', code: 'KeyE' })).toBeNull()
    expect(keyboardAction({ key: 'р' })).toEqual({ type: 'layout-help' })
  })
  it('routes deletion and every navigation key without treating Space as a letter', () => {
    expect(keyboardAction({ key: 'Backspace' })).toEqual({ type: 'erase' })
    expect(keyboardAction({ key: 'Delete' })).toEqual({ type: 'erase' })
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
      expect(keyboardAction({ key })).toEqual({ type: 'navigate', key })
    }
    expect(keyboardAction({ key: ' ' })).toBeNull()
  })
})

it('routes unmodified Enter to the next blank but preserves modifier shortcuts', () => {
  expect(keyboardAction({ key: 'Enter' })).toEqual({ type: 'next' })
  expect(keyboardAction({ key: 'Enter', metaKey: true })).toBeNull()
})
