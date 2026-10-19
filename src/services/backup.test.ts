import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { puzzles } from '../stores/game'
import { clone, edit, initialSession } from '../engine/cipher'
import { createBackup, MAX_BACKUP_BYTES, parseBackup, planRestore } from './backup'
import { publishedQuotes } from '../data/puzzles'
import { createPuzzle } from '../engine/cipher'
const fresh = () => Object.fromEntries(puzzles.map(p => [p.quote.id, initialSession(p)]))
const fixture = () => {
  const sessions = fresh()
  for (const locale of ['en', 'ru']) {
    const p = puzzles.find(p => (p.quote.locale ?? 'en') === locale)!, symbol = p.symbols.find(n => !p.clues[n])!
    sessions[p.quote.id] = edit(p, sessions[p.quote.id]!, symbol, p.solution[symbol]!, true).session
  }
  return { sessions, backup: createBackup(puzzles, sessions, '0.4.0') }
}
describe('portable progress', () => {
  it('round trips both alphabets, clue revisions, hints and history, snapshotting the current in-memory move', () => {
    const { sessions, backup } = fixture()
    const decoded = parseBackup(JSON.stringify(backup), puzzles)
    expect(Object.keys(decoded.sessions)).toHaveLength(2)
    for (const [id, session] of Object.entries(decoded.sessions)) expect(session).toEqual(sessions[id])
    const first = backup.records[0]!
    sessions[first.id]!.undo = []
    expect(first.session.undo).toHaveLength(1)
    expect(backup.records.every(record => record.id && record.revision > 0)).toBe(true)
  })
  it('keeps local progress by default and previews explicit replacements without mutating either input', () => {
    const { backup } = fixture(), parsed = parseBackup(JSON.stringify(backup), puzzles), local = fresh()
    const id = backup.records[0]!.id, p = puzzles.find(p => p.quote.id === id)!, symbol = p.symbols.find(n => !p.clues[n])!
    local[id] = edit(p, local[id]!, symbol, p.solution[symbol]!).session
    const before = clone(local), original = clone(parsed)
    const kept = planRestore(puzzles, local, parsed)
    expect(kept).toMatchObject({ added: 1, replaced: 0, kept: 1 })
    expect(kept.sessions[id]).toEqual(local[id])
    const replaced = planRestore(puzzles, local, parsed, true)
    expect(replaced).toMatchObject({ added: 1, replaced: 1, kept: 0 })
    expect(replaced.sessions[id]).toEqual(parsed.sessions[id])
    expect(local).toEqual(before); expect(parsed).toEqual(original)
  })
  it('validates the entire known backup before any restore and rejects malformed history and duplicate IDs', () => {
    const { backup } = fixture()
    const bad = clone(backup); bad.records[1]!.session.undo[0]!.entries[999] = 'Я'
    expect(() => parseBackup(JSON.stringify(bad), puzzles)).toThrow()
    const duplicate = clone(backup); duplicate.records.push(clone(duplicate.records[0]!))
    expect(() => parseBackup(JSON.stringify(duplicate), puzzles)).toThrow()
    for (const text of ['not JSON', '{}', '[]', JSON.stringify({ ...backup, version: 2 }), JSON.stringify({ ...backup, createdAt: 'yesterday' }), ' '.repeat(MAX_BACKUP_BYTES + 1)]) expect(() => parseBackup(text, puzzles)).toThrow()
  })
  it('skips unavailable future content without deleting local puzzles', () => {
    const { backup } = fixture()
    backup.records.push({ ...clone(backup.records[0]!), id: 'future-puzzle' })
    const decoded = parseBackup(JSON.stringify(backup), puzzles)
    expect(decoded.unavailable).toBe(1)
    const local = fresh(), plan = planRestore(puzzles, local, decoded)
    expect(Object.keys(plan.sessions)).toHaveLength(puzzles.length)
    expect(plan.added).toBe(2)
  })
  it('accepts a compatible old clue revision and retains completion through migration', () => {
    const p = puzzles.find(p => p.quote.previousClues)!, old = createPuzzle(publishedQuotes.find(q => q.id === p.quote.id)!)
    const backup = createBackup(puzzles, fresh(), '0.3.1')
    backup.records.push({ id: p.quote.id, version: 1, revision: 1, session: { ...initialSession(old), entries: { ...old.solution } } })
    const result = parseBackup(JSON.stringify(backup), puzzles)
    expect(result.sessions[p.quote.id]!.entries).toEqual(p.solution)
    expect(result.sessions[p.quote.id]!.hints).toEqual([])
  })
})

it('round trips language-specific resume pointers and ignores unavailable or mismatched pointers', () => {
  const { sessions } = fixture(), id = Object.keys(sessions).find(id => sessions[id]!.hints.length && !puzzles.find(p => p.quote.id === id)!.quote.locale)!
  const backup = createBackup(puzzles, sessions, '0.4.0', { en: id, ru: id })
  const parsed = parseBackup(JSON.stringify(backup), puzzles)
  expect(parsed.resume?.en).toBe(id)
  expect(parsed.resume?.ru).toBeUndefined()
})
