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

describe('language preference compatibility', () => {
  it('migrates an unversioned English preference and isolates progress across languages and reload', async () => {
    let preferences: unknown = { theme: 'dark', haptics: false, currentId: 'carroll-yesterday' }
    const records = new Map<string, unknown>()
    vi.spyOn(storage, 'readRecord').mockImplementation(async key => key === 'preferences' ? preferences : records.get(key))
    vi.spyOn(storage, 'writeRecord').mockImplementation(async (key, value) => { if (key === 'preferences') preferences = structuredClone(value) })
    vi.spyOn(storage, 'saveSession').mockImplementation(async (p, session) => { records.set(`puzzle:${p.quote.id}`, { version: 1, revision: p.quote.revision, session: structuredClone(JSON.parse(JSON.stringify(session))) }) })
    const game = useGameStore()
    await game.initialize()
    expect(game.language).toBe('en')
    expect(game.currentId).toBe('carroll-yesterday')
    game.apply(game.puzzle.solution[game.selected!]!)
    const englishEntries = { ...game.session.entries }
    game.setLanguage('ru')
    expect(game.collection).toHaveLength(12)
    expect(game.puzzle.quote.locale).toBe('ru')
    game.apply(game.puzzle.solution[game.selected!]!)
    const russianId = game.currentId, russianEntries = { ...game.session.entries }
    game.setLanguage('en')
    expect(game.currentId).toBe('carroll-yesterday')
    expect(game.session.entries).toEqual(englishEntries)
    game.switchPuzzle(russianId) // A different language's puzzle cannot desynchronize input and alphabet.
    expect(game.currentId).toBe('carroll-yesterday')
    game.setLanguage('ru')
    expect(game.currentId).toBe(russianId)
    expect(game.session.entries).toEqual(russianEntries)
    await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
    expect(preferences).toMatchObject({ version: 2, language: 'ru' })
    const resumed = useGameStore(createPinia())
    await resumed.initialize()
    expect(resumed.language).toBe('ru')
    expect(resumed.session.entries).toEqual(russianEntries)
    resumed.setLanguage('en')
    expect(resumed.session.entries).toEqual(englishEntries)
    await vi.waitFor(() => expect(resumed.pendingSaves).toBe(0))
    vi.restoreAllMocks()
  })
  it('rejects mismatched last-puzzle preferences and falls back to a valid collection entry', async () => {
    vi.spyOn(storage, 'readRecord').mockImplementation(async key => key === 'preferences' ? { version: 2, language: 'ru', currentId: 'austen-heart', lastPuzzle: { ru: 'hamlet-possibility' } } : undefined)
    const game = useGameStore()
    await game.initialize()
    expect(game.language).toBe('ru')
    expect(game.puzzle.quote.locale).toBe('ru')
    expect(game.storageError).toBe(false)
    vi.restoreAllMocks()
  })
})

it('erases only explicitly checked mistakes, one grouped move at a time, retaining other check marks', async () => {
  vi.spyOn(storage, 'readRecord').mockResolvedValue(undefined)
  vi.spyOn(storage, 'saveSession').mockResolvedValue(undefined)
  const game = useGameStore()
  await game.initialize()
  const [first, second, correct] = game.puzzle.symbols.filter(n => !game.puzzle.clues[n])
  const unused = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(l => !Object.values(game.session.entries).includes(l) && l !== game.puzzle.solution[correct!])
  const firstWrong = unused.find(l => l !== game.puzzle.solution[first!])!
  const secondWrong = unused.find(l => l !== firstWrong && l !== game.puzzle.solution[second!])!
  game.select(first!); game.apply(firstWrong)
  game.select(second!); game.apply(secondWrong)
  game.select(correct!); game.apply(game.puzzle.solution[correct!]!)
  expect(game.eraseChecked(first!)).toBe(false) // No silent answer checking.
  game.check()
  expect(game.checked).toEqual(expect.arrayContaining([first, second]))
  const before = { ...game.session.entries }, moves = game.session.undo.length
  expect(game.eraseChecked(correct!)).toBe(false)
  expect(game.eraseChecked(first!)).toBe(true)
  expect(game.session.entries[first!]).toBeUndefined()
  expect(game.session.entries[correct!]).toBe(before[correct!])
  expect(game.checked).toEqual([second])
  expect(game.session.undo).toHaveLength(moves + 1)
  expect(game.eraseChecked(second!)).toBe(true)
  expect(game.checked).toEqual([])
  game.history('undo')
  expect(game.session.entries[second!]).toBe(secondWrong)
  expect(game.checked).toEqual([])
  game.history('undo')
  expect(game.session.entries).toEqual(before)
  await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
  vi.restoreAllMocks()
})
