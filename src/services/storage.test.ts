import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession, clone } from '../engine/cipher'
import { decodeSession, readRecord, saveSession, writeRecord } from './storage'

const puzzle = createPuzzle(quotes[0]!)
const initial = initialSession(puzzle)
const envelope = () => ({ version: 1, revision: puzzle.quote.revision, session: clone(initial) })

describe('durable progress', () => {
  it('round trips a session with undo history through IndexedDB', async () => {
    const symbol = puzzle.symbols.find(n => !puzzle.clues[n])!
    const changed = edit(puzzle, initial, symbol, puzzle.solution[symbol]!).session
    await saveSession(puzzle, changed)
    expect(decodeSession(puzzle, await readRecord(`puzzle:${puzzle.quote.id}`))).toEqual(changed)
  })
  it('serializes writes and snapshots values before asynchronous work', async () => {
    const value = { revision: 1 }
    const first = writeRecord('order', value)
    value.revision = 2
    const second = writeRecord('order', value)
    value.revision = 3
    await Promise.all([first, second])
    expect(await readRecord('order')).toEqual({ revision: 2 })
  })
  it('rejects unknown schemas, content revisions, changed clues and corrupt histories', () => {
    expect(decodeSession(puzzle, { ...envelope(), version: 2 })).toBe(null)
    expect(decodeSession(puzzle, { ...envelope(), revision: 9 })).toBe(null)
    const altered = envelope(); delete altered.session.entries[Number(Object.keys(puzzle.clues)[0])]
    expect(decodeSession(puzzle, altered)).toBe(null)
    const corrupt = envelope(); corrupt.session.undo.push({ entries: { 999: 'Z' }, hints: [] })
    expect(decodeSession(puzzle, corrupt)).toBe(null)
    const duplicate = envelope(); const editable = puzzle.symbols.find(n => !puzzle.clues[n])!
    duplicate.session.entries[editable] = Object.values(puzzle.clues)[0]!
    expect(decodeSession(puzzle, duplicate)).toBe(null)
    const hint = envelope(); hint.session.hints = [editable]
    expect(decodeSession(puzzle, hint)).toBe(null)
  })
})

it('rolls back a failed multi-record restore and can commit again after the failure', async () => {
  const { writeRecords } = await import('./storage')
  await writeRecord('restore-one', { old: true })
  await expect(writeRecords([{ key: 'restore-one', value: { changed: true } }, { key: undefined as unknown as string, value: { invalid: true } }])).rejects.toThrow()
  expect(await readRecord('restore-one')).toEqual({ old: true })
  await writeRecords([{ key: 'restore-one', value: { committed: true } }, { key: 'restore-two', value: { committed: true } }])
  expect(await readRecord('restore-one')).toEqual({ committed: true })
  expect(await readRecord('restore-two')).toEqual({ committed: true })
})

it('cancels queued restore writes without applying them later and recovers for subsequent saves', async () => {
  const { writeRecords, flushWrites } = await import('./storage')
  await writeRecord('cancelled-restore', { old: true })
  const controller = new AbortController()
  const restore = writeRecords([{ key: 'cancelled-restore', value: { restored: true } }], controller.signal)
  controller.abort(new Error('Cancelled'))
  await expect(restore).rejects.toThrow('Cancelled')
  await expect(flushWrites()).rejects.toThrow('Cancelled')
  expect(await readRecord('cancelled-restore')).toEqual({ old: true })
  await writeRecord('after-cancel', { playable: true })
  expect(await readRecord('after-cancel')).toEqual({ playable: true })
})
