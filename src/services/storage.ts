import { clone, validSession } from '../engine/cipher'
import type { Puzzle, Session } from '../engine/cipher'

export type Theme = 'light' | 'dark' | 'system'
export interface Preferences { version: 2; theme: Theme; haptics: boolean; currentId: string; language: 'en' | 'ru'; lastPuzzle: Partial<Record<'en' | 'ru', string>> }
export interface SavedSession { version: 1; revision: number; session: Session }
let database: Promise<IDBDatabase> | undefined
let queue: Promise<unknown> = Promise.resolve()
function open(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Storage unavailable')); return }
    const request = indexedDB.open('code-cryptogram', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('records')
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); database = undefined }
      resolve(db)
    }
    request.onerror = () => { database = undefined; reject(request.error) }
    request.onblocked = () => reject(new Error('Storage upgrade blocked'))
  })
  return database
}
export async function readRecord(key: string): Promise<unknown> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly')
    const request = tx.objectStore('records').get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.onabort = () => reject(tx.error)
  })
}
export function writeRecord(key: string, value: unknown): Promise<void> {
  const safeValue = clone(value)
  const job = queue.catch(() => undefined).then(async () => {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite')
      tx.objectStore('records').put(safeValue, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  })
  queue = job
  return job
}
export function decodeSession(puzzle: Puzzle, value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null
  const record = value as SavedSession
  return record.version === 1 && record.revision === puzzle.quote.revision && validSession(puzzle, record.session) ? clone(record.session) : null
}
export async function saveSession(puzzle: Puzzle, session: Session) {
  await writeRecord(`puzzle:${puzzle.quote.id}`, { version: 1, revision: puzzle.quote.revision, session })
}

/** Resolve only after every queued write, including the latest move, has committed. */
export async function flushWrites(): Promise<void> { await queue }
