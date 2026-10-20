import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
it('upgrades schema 1 without deleting records and makes old-version writers incompatible', async () => {
  let oldHandle: IDBDatabase | undefined, closedForUpgrade = false
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('code-cryptogram', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('records')
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('records', 'readwrite')
      tx.objectStore('records').put({ preserved: true }, 'legacy-progress')
      tx.oncomplete = () => { oldHandle = db; db.onversionchange = () => { closedForUpgrade = true; db.close() }; resolve() }
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
  const { readRecord } = await import('./storage')
  expect(await readRecord('legacy-progress')).toEqual({ preserved: true })
  expect(closedForUpgrade).toBe(true)
  expect(() => oldHandle!.transaction('records', 'readwrite')).toThrow()
  await expect(new Promise((resolve, reject) => {
    const request = indexedDB.open('code-cryptogram', 1)
    request.onsuccess = () => { request.result.close(); resolve('unexpected old connection') }
    request.onerror = () => reject(request.error)
  })).rejects.toMatchObject({ name: 'VersionError' })
})
