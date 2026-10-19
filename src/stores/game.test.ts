import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from './game'
import * as storage from '../services/storage'

beforeEach(() => { setActivePinia(createPinia()) })

describe('game orchestration', () => {
  it('keeps check markers ephemeral and isolates puzzle sessions', async () => {
    const game = useGameStore()
    await game.initialize()
    const first = game.currentId, symbol = game.puzzle.symbols.find(n => !game.puzzle.clues[n])!
    game.select(symbol)
    const wrong = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(l => l !== game.puzzle.solution[symbol] && !Object.values(game.session.entries).includes(l))!
    game.apply(wrong)
    expect(game.checked).toEqual([])
    game.check()
    expect(game.checked).toContain(symbol)
    game.history('undo')
    expect(game.checked).toEqual([])
    game.history('redo')
    game.switchPuzzle('hamlet-possibility')
    expect(game.session.entries).toEqual(game.puzzle.clues)
    game.switchPuzzle(first)
    expect(game.session.entries[symbol]).toBe(wrong)
    await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
    const resumed = useGameStore(createPinia())
    await resumed.initialize()
    expect(resumed.currentId).toBe(first)
    expect(resumed.session.entries[symbol]).toBe(wrong)
    game.restart()
    expect(game.session.undo).toEqual([])
    expect(game.session.entries).toEqual(game.puzzle.clues)
    await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
  })
  it('keeps play available when storage is unavailable', async () => {
    const read = vi.spyOn(storage, 'readRecord').mockRejectedValue(new Error('Denied'))
    const save = vi.spyOn(storage, 'saveSession').mockRejectedValue(new Error('Quota exceeded'))
    const game = useGameStore()
    await game.initialize()
    expect(game.ready).toBe(true)
    expect(game.storageError).toBe(true)
    game.apply(game.puzzle.solution[game.selected!]!)
    expect(game.session.undo).toHaveLength(1)
    await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
    read.mockRestore(); save.mockRestore()
  })
})

describe('completion and hint intent', () => {
  it('does not use correctness to select a hint and restores solving after undoing completion', async () => {
    vi.spyOn(storage, 'readRecord').mockResolvedValue(undefined)
    const game = useGameStore()
    await game.initialize()
    const symbol = game.selected!
    game.apply(game.puzzle.solution[symbol]!)
    expect(game.hintTarget).toBe(symbol) // Existing correct guesses are still editable, not pre-judged.
    for (const n of game.puzzle.symbols.filter(n => !game.puzzle.clues[n])) {
      game.select(n); game.apply(game.puzzle.solution[n]!)
    }
    expect(game.complete).toBe(true)
    game.selected = null // A completed save may have no remaining blank selection.
    game.history('undo')
    expect(game.complete).toBe(false)
    expect(game.selected).not.toBeNull()
    expect(game.locked).toBe(false)
    await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
    vi.restoreAllMocks()
  })
})

it('reports accepted edits without advancing selection on rejected or unchanged input', async () => {
  vi.spyOn(storage, 'readRecord').mockResolvedValue(undefined)
  const game = useGameStore()
  await game.initialize()
  const symbol = game.selected!, letter = game.puzzle.solution[symbol]!
  expect(game.apply(letter)).toBe(true)
  expect(game.selected).toBe(symbol) // The board controller owns occurrence-based focus.
  expect(game.apply(letter)).toBe(false)
  expect(game.apply(Object.values(game.puzzle.clues)[0]!)).toBe(false)
  expect(game.session.undo).toHaveLength(1)
  await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
  vi.restoreAllMocks()
})
