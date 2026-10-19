type Worker = Pick<ServiceWorker, 'state' | 'postMessage' | 'addEventListener' | 'removeEventListener'>
export interface UpdateRegistration { readonly waiting: Worker | null; readonly active: Worker | null; readonly installing: Worker | null }
export const UPDATE_TIMEOUT_MS = 30_000

/** State is also polled: a suspended Android PWA can miss the event that completed activation. */
function waitForWorker(worker: Worker, ready: () => boolean, signal: AbortSignal, start?: () => void) {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    function finish(error?: unknown) {
      if (settled) return
      settled = true
      clearTimeout(timeout); clearInterval(poll)
      worker.removeEventListener('statechange', check)
      signal.removeEventListener('abort', abort)
      if (error) reject(error); else resolve()
    }
    function check() {
      if (ready()) finish()
      else if (worker.state === 'redundant') finish(new Error('Update was discarded'))
    }
    function abort() { finish(new DOMException('Update canceled', 'AbortError')) }
    const poll = setInterval(check, 250)
    const timeout = setTimeout(() => { check(); finish(new Error('Update timed out')) }, UPDATE_TIMEOUT_MS)
    worker.addEventListener('statechange', check)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    check()
    if (!settled) { try { start?.(); check() } catch (error) { finish(error) } }
  })
}
export async function waitForInstallation(registration: UpdateRegistration, signal: AbortSignal) {
  const worker = registration.installing
  if (worker) await waitForWorker(worker, () => worker.state === 'installed' || worker.state === 'activated', signal)
}
export async function activateWaitingWorker(registration: UpdateRegistration, signal: AbortSignal) {
  await waitForInstallation(registration, signal)
  const worker = registration.waiting
  // Another tab may already have activated it. A requested reload can use that active version.
  if (!worker) return
  const previous = registration.active
  await waitForWorker(worker, () => worker.state === 'activated' || (registration.active !== previous && registration.active?.state === 'activated'), signal,
    () => worker.postMessage({ type: 'SKIP_WAITING' }))
}
function waitForSave(save: () => Promise<void>, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    function finish(error?: unknown) {
      clearTimeout(timeout); signal.removeEventListener('abort', abort)
      if (error) reject(error); else resolve()
    }
    function abort() { finish(new DOMException('Update canceled', 'AbortError')) }
    const timeout = setTimeout(() => finish(new Error('Saving timed out')), UPDATE_TIMEOUT_MS)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    // Keep observing a late save/rejection, but it can no longer activate a canceled update.
    Promise.resolve().then(save).then(() => finish(), finish)
  })
}
export type UpdatePhase = 'idle' | 'saving' | 'activating'
export type UpdateFailure = 'save' | 'activation' | null
interface UpdateEnvironment {
  save: () => Promise<void>
  registration: () => UpdateRegistration | undefined
  reload: () => void
  changed: (phase: UpdatePhase, failure: UpdateFailure) => void
}
/** Freeze input before flushing writes; a late activation event must never reload unrequested play. */
export function createUpdateAction(environment: UpdateEnvironment) {
  const lifetime = new AbortController()
  let busy = false, reloaded = false
  return {
    async apply() {
      if (busy || reloaded || lifetime.signal.aborted) return
      busy = true
      let phase: UpdatePhase = 'saving'
      environment.changed(phase, null)
      try {
        await waitForSave(environment.save, lifetime.signal)
        if (lifetime.signal.aborted) return
        phase = 'activating'; environment.changed(phase, null)
        const registration = environment.registration()
        if (!registration) throw new Error('Updates unavailable')
        await activateWaitingWorker(registration, lifetime.signal)
        if (lifetime.signal.aborted) return
        environment.reload(); reloaded = true
      } catch {
        if (!lifetime.signal.aborted) environment.changed('idle', phase === 'saving' ? 'save' : 'activation')
      } finally { busy = false }
    },
    dispose() { lifetime.abort() },
  }
}
