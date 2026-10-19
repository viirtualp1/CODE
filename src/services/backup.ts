import { clone, validSession } from '../engine/cipher'
import type { Puzzle, Session } from '../engine/cipher'
import { progressStatus } from '../engine/collection'
import { decodeSession } from './storage'
import type { SavedSession } from './storage'
export const MAX_BACKUP_BYTES = 16 * 1024 * 1024
export interface ProgressBackup {
  format: 'code-progress'; version: 1; createdAt: string; appVersion: string
  resume?: Partial<Record<'en' | 'ru', string>>
  records: (SavedSession & { id: string })[]
}
export interface ParsedBackup { sessions: Record<string, Session>; unavailable: number; createdAt: string; resume?: Partial<Record<'en' | 'ru', string>> }
export function createBackup(puzzles: readonly Puzzle[], sessions: Record<string, Session>, appVersion: string, resume: Partial<Record<'en' | 'ru', string>> = {}): ProgressBackup {
  return { format: 'code-progress', version: 1, createdAt: new Date().toISOString(), appVersion, resume: clone(resume),
    records: puzzles.filter(puzzle => progressStatus(puzzle, sessions[puzzle.quote.id]!) !== 'new').map(puzzle => {
      const session = sessions[puzzle.quote.id]!
      if (!validSession(puzzle, session)) throw new Error('Invalid in-memory session')
      return { id: puzzle.quote.id, version: 1, revision: puzzle.quote.revision, session: clone(session) }
    }) }
}
export function parseBackup(text: string, puzzles: readonly Puzzle[]): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) throw new Error('Backup too large')
  const input: unknown = JSON.parse(text)
  if (!input || typeof input !== 'object') throw new Error('Invalid backup')
  const value = input as Partial<ProgressBackup>
  if (value.format !== 'code-progress' || value.version !== 1 || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || typeof value.appVersion !== 'string' || value.appVersion.length > 32 || !Array.isArray(value.records) || value.records.length > 1000) throw new Error('Unsupported backup')
  const sessions: Record<string, Session> = {}, seen = new Set<string>()
  let unavailable = 0
  for (const item of value.records) {
    if (!item || typeof item.id !== 'string' || !/^[a-z]+(?:-[a-z]+)+$/.test(item.id) || item.id.length > 160 || seen.has(item.id) || item.version !== 1 || !Number.isInteger(item.revision) || item.revision < 1) throw new Error('Invalid backup record')
    seen.add(item.id)
    const puzzle = puzzles.find(p => p.quote.id === item.id)
    if (!puzzle || (item.revision !== puzzle.quote.revision && !(item.revision === 1 && puzzle.quote.previousClues))) { unavailable++; continue }
    const session = decodeSession(puzzle, item)
    if (!session) throw new Error('Corrupt puzzle progress')
    if (progressStatus(puzzle, session) !== 'new') sessions[item.id] = session
  }
  const resume: Partial<Record<'en' | 'ru', string>> = {}
  for (const locale of ['en', 'ru'] as const) {
    const id = value.resume?.[locale]
    if (typeof id === 'string' && sessions[id] && puzzles.some(p => p.quote.id === id && (p.quote.locale ?? 'en') === locale)) resume[locale] = id
  }
  return { sessions, unavailable, createdAt: value.createdAt, resume }
}
export function planRestore(puzzles: readonly Puzzle[], local: Record<string, Session>, backup: ParsedBackup, replaceExisting = false) {
  const sessions = clone(local)
  let added = 0, replaced = 0, kept = 0
  for (const [id, incoming] of Object.entries(backup.sessions)) {
    const puzzle = puzzles.find(p => p.quote.id === id)
    if (!puzzle || !validSession(puzzle, incoming)) throw new Error('Invalid restore plan')
    if (progressStatus(puzzle, sessions[id]!) === 'new') { sessions[id] = clone(incoming); added++ }
    else if (replaceExisting && JSON.stringify(sessions[id]) !== JSON.stringify(incoming)) { sessions[id] = clone(incoming); replaced++ }
    else kept++
  }
  return { sessions, added, replaced, kept, unavailable: backup.unavailable }
}
