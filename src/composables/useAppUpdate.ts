import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { flushWrites } from '../services/storage'
import { createUpdateAction, waitForInstallation } from '../services/update'
import type { UpdateFailure, UpdatePhase } from '../services/update'

export function useAppUpdate() {
  let registration: ServiceWorkerRegistration | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let disposed = false
  const lifetime = new AbortController()
  const phase = ref<UpdatePhase>('idle')
  const failure = ref<UpdateFailure>(null)
  const checking = ref(false)
  const supported = 'serviceWorker' in navigator && import.meta.env.PROD
  const result = ref<'idle' | 'current' | 'offline' | 'unavailable' | 'failed'>(supported ? 'idle' : 'unavailable')
  const busy = computed(() => phase.value !== 'idle')
  const installedWorkers = new Set<ServiceWorker>()
  function syncWaiting() {
    if (!disposed && registration?.waiting && navigator.serviceWorker.controller) needRefresh.value = true
  }
  function observeInstallation() {
    const worker = registration?.installing
    if (!worker || installedWorkers.has(worker)) return
    installedWorkers.add(worker)
    worker.addEventListener('statechange', syncWaiting)
  }
  const { needRefresh } = useRegisterSW({
    // Activation in another tab must not reload this puzzle. Our explicit action owns reload.
    onNeedReload() {},
    onRegisteredSW(_url, registered) {
      if (disposed) return
      registration = registered
      registration?.addEventListener('updatefound', observeInstallation)
      observeInstallation(); syncWaiting()
      void check(false)
    },
    onRegisterError() { result.value = 'unavailable' },
  })
  const action = createUpdateAction({
    save: flushWrites,
    registration: () => registration,
    reload: () => window.location.reload(),
    changed: (nextPhase, nextFailure) => { phase.value = nextPhase; failure.value = nextFailure },
  })
  async function check(manual = true) {
    if (disposed || checking.value || busy.value) return
    if (!manual && document.visibilityState !== 'visible') return
    if (!navigator.onLine) { if (manual) result.value = 'offline'; return }
    if (!supported) { if (manual) result.value = 'unavailable'; return }
    checking.value = true
    try {
      registration ??= await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
      if (!registration) { if (manual) result.value = 'unavailable'; return }
      await registration.update()
      await waitForInstallation(registration, lifetime.signal)
      if (disposed) return
      syncWaiting(); result.value = 'current'
    } catch { if (!disposed) result.value = 'failed' }
    finally { checking.value = false }
  }
  function resume() { void check(false) }
  onMounted(() => {
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('online', resume)
    timer = setInterval(resume, 60_000)
  })
  onBeforeUnmount(() => {
    disposed = true; clearInterval(timer); lifetime.abort(); action.dispose()
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('online', resume)
    registration?.removeEventListener('updatefound', observeInstallation)
    for (const worker of installedWorkers) worker.removeEventListener('statechange', syncWaiting)
  })
  return { needRefresh, busy, phase, failure, checking, result, check, apply: action.apply }
}
