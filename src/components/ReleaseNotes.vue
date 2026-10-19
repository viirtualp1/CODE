<script setup lang="ts">
import { computed } from 'vue'
import { Download, RefreshCw } from '@lucide/vue'
import releases from '../data/releases.json'
import type { UpdateFailure, UpdatePhase } from '../services/update'
const props = defineProps<{
  available: boolean; busy: boolean; checking: boolean; phase: UpdatePhase; failure: UpdateFailure
  result: 'idle' | 'current' | 'offline' | 'unavailable' | 'failed'
}>()
const emit = defineEmits<{ check: []; apply: [] }>()
const current = releases[0]!
const status = computed(() => {
  if (props.phase === 'saving') return 'Saving your latest move…'
  if (props.phase === 'activating') return 'Updating CODE…'
  if (props.failure === 'save') return 'Your latest move could not be saved. Keep playing and try again later.'
  if (props.failure === 'activation') return 'The update could not finish. Your progress is safe. Please retry.'
  if (props.available) return 'A new version is downloaded and ready.'
  if (props.checking) return 'Checking for updates…'
  if (props.result === 'offline') return 'You’re offline. You can keep playing and read these notes.'
  if (props.result === 'unavailable') return 'Update checks are unavailable here. Open the installed app or production website.'
  if (props.result === 'failed') return 'Could not check for updates. Please try again later.'
  if (props.result === 'current') return 'You’re up to date.'
  return 'Updates are checked quietly when you return to CODE.'
})
const date = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value+'T00:00:00Z'))
</script>
<template>
  <section class="release-update" aria-label="App updates" :aria-busy="busy || checking">
    <div class="edition-line"><span>Installed edition</span><strong>v{{ current.version }}</strong></div>
    <p class="release-status" role="status" aria-live="polite">{{ status }}</p>
    <button v-if="available || failure" class="primary-button" :disabled="busy || checking" @click="emit('apply')"><Download :size="16" />{{ busy ? 'Updating…' : failure ? 'Retry update' : 'Update & restart' }}</button>
    <button v-else class="secondary-button" :disabled="busy || checking" @click="emit('check')"><RefreshCw :size="16" />{{ checking ? 'Checking…' : 'Check for updates' }}</button>
  </section>
  <section class="release-history" aria-label="Release history">
    <article v-for="release in releases" :key="release.version" class="release-entry">
      <div class="release-meta"><span>v{{ release.version }}<small v-if="release.version === current.version">Installed</small></span><time :datetime="release.date">{{ date(release.date) }}</time></div>
      <h3>{{ release.title }}</h3>
      <ul><li v-for="change in release.changes" :key="change">{{ change }}</li></ul>
    </article>
  </section>
</template>
