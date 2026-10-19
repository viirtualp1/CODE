import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activateWaitingWorker, createUpdateAction, UPDATE_TIMEOUT_MS } from './update'
import type { UpdateFailure, UpdatePhase } from './update'

function worker(state: ServiceWorkerState = 'installed') {
  return Object.assign(new EventTarget(), { state, postMessage: vi.fn() })
}
function fixture() {
  const waiting = worker()
  const registration = { waiting: waiting as ReturnType<typeof worker> | null, active: worker('activated'), installing: null as ReturnType<typeof worker> | null }
  const save = vi.fn().mockResolvedValue(undefined), reload = vi.fn()
  const changed = vi.fn<(phase: UpdatePhase, failure: UpdateFailure) => void>()
  const action = createUpdateAction({ save, reload, changed, registration: () => registration })
  return { waiting, registration, save, reload, changed, action }
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('requested PWA activation', () => {
  it('waits for installation and actual activation before completing', async () => {
    const f = fixture(), installing = worker('installing')
    f.registration.waiting = null; f.registration.installing = installing
    const pending = activateWaitingWorker(f.registration, new AbortController().signal)
    expect(installing.postMessage).not.toHaveBeenCalled()
    f.registration.waiting = installing; f.registration.installing = null
    installing.state = 'installed'; installing.dispatchEvent(new Event('statechange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(installing.postMessage).toHaveBeenCalledExactlyOnceWith({ type:'SKIP_WAITING' })
    installing.state = 'activated'; installing.dispatchEvent(new Event('statechange'))
    await pending
    expect(vi.getTimerCount()).toBe(0)
  })
  it('recovers when the activation event was missed while the PWA slept', async () => {
    const f = fixture(), pending = activateWaitingWorker(f.registration, new AbortController().signal)
    await Promise.resolve()
    f.waiting.state = 'activated'
    await vi.advanceTimersByTimeAsync(250); await pending
    expect(vi.getTimerCount()).toBe(0)
  })
  it('recognizes a version activated by another tab without requiring a waiting worker', async () => {
    const f = fixture(); f.registration.waiting = null
    await activateWaitingWorker(f.registration, new AbortController().signal)
    expect(f.waiting.postMessage).not.toHaveBeenCalled()
  })
  it('accepts a superseding active worker, but never mistakes the old active worker for the update', async () => {
    const f = fixture(), done = vi.fn()
    const pending = activateWaitingWorker(f.registration, new AbortController().signal).then(done)
    await vi.advanceTimersByTimeAsync(250)
    expect(done).not.toHaveBeenCalled()
    f.waiting.state = 'redundant'; f.registration.active = worker('activated')
    await vi.advanceTimersByTimeAsync(250); await pending
    expect(done).toHaveBeenCalledOnce()
  })
  it('rejects failed installation and cleans listeners/timers', async () => {
    const f = fixture(), installing = worker('installing')
    f.registration.installing = installing
    const pending = activateWaitingWorker(f.registration, new AbortController().signal)
    const rejected = expect(pending).rejects.toThrow('discarded')
    installing.state = 'redundant'; installing.dispatchEvent(new Event('statechange'))
    await rejected
    expect(f.waiting.postMessage).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('bounds an unresponsive activation and removes listeners', async () => {
    const f = fixture(), remove = vi.spyOn(f.waiting,'removeEventListener')
    const pending = activateWaitingWorker(f.registration, new AbortController().signal)
    const rejected = expect(pending).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(UPDATE_TIMEOUT_MS); await rejected
    expect(remove).toHaveBeenCalledWith('statechange',expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })
})
describe('save-before-update orchestration', () => {
  it('locks before saving, flushes the latest move, prevents duplicate requests and reloads only once', async () => {
    const f = fixture(); let commit!: () => void
    f.save.mockReturnValue(new Promise<void>(resolve => { commit = resolve }))
    const pending = f.action.apply(); await f.action.apply()
    expect(f.changed).toHaveBeenCalledWith('saving',null)
    expect(f.waiting.postMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(0)
    expect(f.save).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(0); commit(); await vi.advanceTimersByTimeAsync(0)
    expect(f.waiting.postMessage).toHaveBeenCalledOnce()
    expect(f.reload).not.toHaveBeenCalled()
    f.waiting.state = 'activated'; f.waiting.dispatchEvent(new Event('statechange'))
    await pending; await f.action.apply()
    expect(f.reload).toHaveBeenCalledOnce()
  })
  it('does not activate or reload when the latest move cannot be saved, and permits retry', async () => {
    const f = fixture(); f.save.mockRejectedValueOnce(new Error('Quota'))
    await f.action.apply()
    expect(f.changed).toHaveBeenLastCalledWith('idle','save')
    expect(f.waiting.postMessage).not.toHaveBeenCalled(); expect(f.reload).not.toHaveBeenCalled()
    f.registration.waiting = null; await f.action.apply()
    expect(f.reload).toHaveBeenCalledOnce()
  })
  it('unlocks if saving stalls and never activates when that old save later finishes', async () => {
    const f = fixture(); let commit!: () => void
    f.save.mockReturnValue(new Promise<void>(resolve => { commit = resolve }))
    const pending = f.action.apply()
    await vi.advanceTimersByTimeAsync(UPDATE_TIMEOUT_MS); await pending
    expect(f.changed).toHaveBeenLastCalledWith('idle','save')
    commit(); await vi.advanceTimersByTimeAsync(0)
    expect(f.waiting.postMessage).not.toHaveBeenCalled(); expect(f.reload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('unlocks after timeout and allows a fresh attempt', async () => {
    const f = fixture(), pending = f.action.apply()
    await vi.advanceTimersByTimeAsync(UPDATE_TIMEOUT_MS); await pending
    expect(f.changed).toHaveBeenLastCalledWith('idle','activation')
    expect(f.reload).not.toHaveBeenCalled()
    f.registration.waiting = null; await f.action.apply()
    expect(f.reload).toHaveBeenCalledOnce()
  })
  it('handles messaging failure without reloading stale files', async () => {
    const f = fixture(); f.waiting.postMessage.mockImplementation(() => { throw new Error('Disconnected') })
    await f.action.apply()
    expect(f.changed).toHaveBeenLastCalledWith('idle','activation')
    expect(f.reload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('never activates or reloads from a disposed save or late worker event', async () => {
    const f = fixture(); let commit!: () => void
    f.save.mockReturnValue(new Promise<void>(resolve => { commit = resolve }))
    const pending = f.action.apply(); await vi.advanceTimersByTimeAsync(0); f.action.dispose(); commit(); await pending
    expect(f.waiting.postMessage).not.toHaveBeenCalled(); expect(f.reload).not.toHaveBeenCalled()
    const other = fixture(), second = other.action.apply()
    await vi.advanceTimersByTimeAsync(0); other.action.dispose(); await second
    other.waiting.state = 'activated'; other.waiting.dispatchEvent(new Event('statechange'))
    expect(other.reload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
