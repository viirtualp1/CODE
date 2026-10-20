import { migrateClues } from '../engine/migration'
import { clone, validSession } from '../engine/cipher'
import type { Puzzle, Session } from '../engine/cipher'

export type Theme = 'light' | 'dark' | 'system'
export interface Preferences { version: 2; theme: Theme; haptics: boolean; currentId: string; language: 'en' | 'ru'; lastPuzzle: Partial<Record<'en' | 'ru', string>> }
export interface SavedSession { version: 1; revision: number; session: Session }
let database: Promise<IDBDatabase> | undefined
let queue: Promise<unknown> = Promise.resolve()
// Each tab remembers the exact durable puzzle snapshots it read or committed.
const observed = new Map<string, string | undefined>()
const conflicts = new Set<string>()
export class ProgressConflict extends Error {
  constructor(readonly key: string) { super('Progress changed in another tab'); this.name = 'ProgressConflict' }
}
const progressKey = (key: string) => key.startsWith('puzzle:')
const fingerprint = (value: unknown) => JSON.stringify(value)
let channel: BroadcastChannel | undefined
const listeners = new Set<(keys: string[]) => void>()
export function subscribeProgress(listener: (keys: string[]) => void): () => void {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' && !channel) {
    try { channel = new BroadcastChannel('code-progress') } catch { /* Focus refresh remains available. */ }
    if (channel) channel.onmessage = event => {
      if (!Array.isArray(event.data) || event.data.length > 1000 || !event.data.every(key => typeof key === 'string' && progressKey(key))) return
      for (const callback of listeners) callback(event.data)
    }
  }
  listeners.add(listener)
  return () => { listeners.delete(listener); if (!listeners.size) { channel?.close(); channel = undefined } }
}
export function acknowledgeProgressReload() { conflicts.clear(); queue = queue.catch(() => undefined) }
function open(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Storage unavailable')); return }
    const request = indexedDB.open('code-cryptogram', 2)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('records')) request.result.createObjectStore('records') }
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
export function observeProgressRecord(key: string, value: unknown) { if (progressKey(key)) observed.set(key, fingerprint(value)) }
export async function readRecord(key: string, remember = true): Promise<unknown> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly')
    const request = tx.objectStore('records').get(key)
    request.onsuccess = () => {
      if (remember) observeProgressRecord(key, request.result)
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    tx.onabort = () => reject(tx.error)
  })
}
export function writeRecord(key: string, value: unknown): Promise<void> { return writeRecords([{ key, value }]) }
/** A restore is all-or-nothing, in the same ordered queue as ordinary moves. */
export function writeRecords(records: { key: string; value: unknown }[], signal?: AbortSignal): Promise<void> {
  const safeRecords = clone(records)
  let transactionStarted = false
  const job = queue.catch(() => undefined).then(async () => {
    const db = await open()
    signal?.throwIfAborted()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite')
      transactionStarted = true
      const abort = () => { try { tx.abort() } catch { /* Already committed: let oncomplete report success. */ } }
      const cleanup = () => signal?.removeEventListener('abort', abort)
      signal?.addEventListener('abort', abort, { once: true })
      tx.oncomplete = () => {
        cleanup()
        const keys: string[] = []
        for (const record of safeRecords) if (progressKey(record.key)) { observed.set(record.key, fingerprint(record.value)); keys.push(record.key) }
        if (keys.length) { try { channel?.postMessage(keys) } catch { /* Notifications are optional; the transaction guard is authoritative. */ } }
        resolve()
      }
      tx.onerror = () => { cleanup(); reject(tx.error) }
      let conflict: ProgressConflict | undefined
      tx.onabort = () => { cleanup(); reject(conflict ?? tx.error ?? new Error('Transaction aborted')) }
      try {
        const store = tx.objectStore('records')
        const guarded = safeRecords.filter(record => progressKey(record.key))
        const putAll = () => { try { for (const record of safeRecords) store.put(record.value, record.key) } catch (error) { tx.abort(); reject(error) } }
        if (!guarded.length) putAll()
        else {
          let remaining = guarded.length
          for (const record of guarded) {
            const request = store.get(record.key)
            request.onsuccess = () => {
              if (conflict) return
              if (conflicts.has(record.key) || (fingerprint(request.result) !== observed.get(record.key) && fingerprint(request.result) !== fingerprint(record.value))) {
                conflicts.add(record.key); conflict = new ProgressConflict(record.key); tx.abort(); return
              }
              if (--remaining === 0) putAll()
            }
          }
        }
      } catch (error) { tx.abort(); reject(error) }
    })
  })
  queue = job
  if (!signal) return job
  // Before the job starts, a stalled earlier write must not trap the restore screen.
  return new Promise<void>((resolve, reject) => {
    const abortQueued = () => { if (!transactionStarted) reject(signal.reason ?? new Error('Restore cancelled')) }
    signal.addEventListener('abort', abortQueued, { once: true })
    if (signal.aborted) abortQueued()
    const cleanup = () => signal.removeEventListener('abort', abortQueued)
    job.then(() => { cleanup(); resolve() }, error => { cleanup(); reject(error) })
  })
}
export function decodeSession(puzzle: Puzzle, value: unknown): Session | null {
  if (!value || typeof value !== 'object') return null
  const record = value as SavedSession
  if (record.version !== 1) return null
  if (record.revision === puzzle.quote.revision) return validSession(puzzle, record.session) ? clone(record.session) : null
  return migrateClues(puzzle, record.session, record.revision)
}
export async function saveSession(puzzle: Puzzle, session: Session) {
  await writeRecord(`puzzle:${puzzle.quote.id}`, { version: 1, revision: puzzle.quote.revision, session })
}

/** Resolve only after every queued write, including the latest move, has committed. */
export async function flushWrites(): Promise<void> { await queue; if (conflicts.size) throw new ProgressConflict([...conflicts][0]!) }
