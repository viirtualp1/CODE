import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from './game'
import * as storage from '../services/storage'
import { appearanceKey } from '../services/appearance'

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('launch preferences and safe resume', () => {
  it.each(['system', 'dark', 'light'] as const)('persists and restores the %s choice', async theme => {
    let preference: unknown
    const cache = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key), setItem: (key: string, value: string) => cache.set(key, value) })
    vi.spyOn(storage, 'readRecord').mockImplementation(async key => key === 'preferences' ? preference : undefined)
    vi.spyOn(storage, 'writeRecord').mockImplementation(async (_, value) => { preference = JSON.parse(JSON.stringify(value)) })
    const game = useGameStore(); await game.initialize()
    expect(game.theme).toBe('system')
    game.setTheme(theme); await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
    expect(cache.get(appearanceKey)).toBe(theme)
    const returned = useGameStore(createPinia()); await returned.initialize()
    expect(returned.theme).toBe(theme)
    expect(returned.resumeId).toBeNull()
  })
  it('loads legacy appearance before ready and rejects an invalid stored choice', async () => {
    const read = vi.spyOn(storage, 'readRecord').mockImplementation(async key => key === 'preferences' ? { theme: 'dark' } : undefined)
    const game = useGameStore(); expect(game.ready).toBe(false); await game.initialize()
    expect(game.theme).toBe('dark'); expect(game.ready).toBe(true)
    read.mockImplementation(async key => key === 'preferences' ? { theme: 'invalid' } : undefined)
    const invalid = useGameStore(createPinia()); await invalid.initialize(); expect(invalid.theme).toBe('system')
  })
  it('resumes assignments, hints and history after navigation, puzzle switching and a fresh store', async () => {
    const records = new Map<string, unknown>()
    vi.spyOn(storage, 'readRecord').mockImplementation(async key => records.get(key))
    vi.spyOn(storage, 'writeRecord').mockImplementation(async (key, value) => { records.set(key, JSON.parse(JSON.stringify(value))) })
    vi.spyOn(storage, 'saveSession').mockImplementation(async (puzzle, session) => { records.set(`puzzle:${puzzle.quote.id}`, { version: 1, revision: puzzle.quote.revision, session: JSON.parse(JSON.stringify(session)) }) })
    const game = useGameStore(); await game.initialize()
    expect(game.resumeId).toBeNull()
    const id = game.currentId
    game.apply(game.puzzle.solution[game.selected!]!)
    game.selected = null; game.revealHint()
    const saved = JSON.stringify(game.session)
    expect(game.resumeId).toBe(id)
    game.switchPuzzle(game.collection[1]!.quote.id)
    expect(game.resumeId).toBe(id) // A fresh current puzzle cannot hide unfinished work.
    game.switchPuzzle(id)
    await vi.waitFor(() => expect(game.pendingSaves).toBe(0))
    const returned = useGameStore(createPinia()); await returned.initialize()
    expect(returned.resumeId).toBe(id)
    expect(JSON.stringify(returned.session)).toBe(saved)
    returned.history('undo'); expect(JSON.stringify(returned.session)).not.toBe(saved)
    await vi.waitFor(() => expect(returned.pendingSaves).toBe(0))
  })
})
