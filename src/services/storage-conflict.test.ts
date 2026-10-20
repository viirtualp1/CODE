import 'fake-indexeddb/auto'
import { expect, it, vi } from 'vitest'
async function tabs() {
  vi.resetModules(); const first = await import('./storage')
  vi.resetModules(); const second = await import('./storage')
  return { first, second }
}
it('atomically rejects a stale tab, keeps its conflict latched across other writes, and supports explicit recovery', async () => {
  const { first, second } = await tabs(), key = 'puzzle:cross-tab-edit'
  await Promise.all([first.readRecord(key), second.readRecord(key)])
  await first.writeRecord(key, { moves: ['A'] })
  await expect(second.writeRecord(key, { moves: ['B'] })).rejects.toBeInstanceOf(second.ProgressConflict)
  expect(await first.readRecord(key)).toEqual({ moves: ['A'] })
  await second.writeRecord('preferences', { theme: 'dark' })
  await expect(second.flushWrites()).rejects.toBeInstanceOf(second.ProgressConflict)
  await second.readRecord(key)
  second.acknowledgeProgressReload()
  await expect(second.flushWrites()).resolves.toBeUndefined()
  await second.writeRecord(key, { moves: ['A', 'C'] })
  expect(await first.readRecord(key)).toEqual({ moves: ['A', 'C'] })
})
it('rolls back an entire stale restore while allowing independent puzzle edits and rapid queued moves', async () => {
  const { first, second } = await tabs(), key = 'puzzle:cross-tab-restore', other = 'puzzle:independent-tab'
  await Promise.all([first.readRecord(key), second.readRecord(key), second.readRecord(other)])
  await Promise.all([first.writeRecord(key, { move: 1 }), second.writeRecord(other, { independent: true })])
  await expect(second.writeRecords([{ key: 'atomic-companion', value: { changed: true } }, { key, value: { stale: true } }])).rejects.toBeInstanceOf(second.ProgressConflict)
  expect(await first.readRecord('atomic-companion')).toBeUndefined()
  expect(await first.readRecord(key)).toEqual({ move: 1 })
  expect(await first.readRecord(other)).toEqual({ independent: true })
  const one = first.writeRecord(key, { move: 2 }), two = first.writeRecord(key, { move: 3 })
  await Promise.all([one, two])
  expect(await first.readRecord(key)).toEqual({ move: 3 })
})

it('keeps notification failure optional, with transaction protection still available', async () => {
  const { first } = await tabs()
  vi.stubGlobal('window', {})
  vi.stubGlobal('BroadcastChannel', class { constructor() { throw new Error('Unavailable') } })
  try {
    let unsubscribe!: () => void
    expect(() => { unsubscribe = first.subscribeProgress(() => undefined) }).not.toThrow()
    unsubscribe()
  } finally { vi.unstubAllGlobals() }
})
it('allows equivalent simultaneous writes such as the same compatible migration', async () => {
  const { first, second } = await tabs(), key = 'puzzle:equivalent-upgrade'
  await Promise.all([first.readRecord(key), second.readRecord(key)])
  await first.writeRecord(key, { revision: 3, same: true })
  await expect(second.writeRecord(key, { revision: 3, same: true })).resolves.toBeUndefined()
  await expect(second.flushWrites()).resolves.toBeUndefined()
})
