<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { Download, RefreshCw } from '@lucide/vue'
import releases from '../data/releases.json'
import type { UpdateFailure, UpdatePhase } from '../services/update'
const props = defineProps<{
  available: boolean; busy: boolean; checking: boolean; phase: UpdatePhase; failure: UpdateFailure
  result: 'idle' | 'current' | 'offline' | 'unavailable' | 'failed'
}>()
const emit = defineEmits<{ check: []; apply: [] }>()
const { t, locale } = useI18n()
const localized = computed(() => releases.map(release => ({ ...release, ...(locale.value === 'ru' ? release.ru : {}) })))
const current = releases[0]!
const status = computed(() => {
  if (props.phase === 'saving') return t('savingUpdate')
  if (props.phase === 'activating') return t('activatingUpdate')
  if (props.failure === 'save') return t('saveFailure')
  if (props.failure === 'activation') return t('activationFailure')
  if (props.available) return t('updateReady')
  if (props.checking) return t('checkingUpdate')
  if (props.result === 'offline') return t('offlineUpdate')
  if (props.result === 'unavailable') return t('unavailableUpdate')
  if (props.result === 'failed') return t('failedUpdate')
  if (props.result === 'current') return t('upToDate')
  return t('quietUpdates')
})
const date = (value: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value+'T00:00:00Z'))
</script>
<template>
  <section class="release-update" :aria-label="t('appUpdates')" :aria-busy="busy || checking">
    <div class="edition-line"><span>{{ t('installedEdition') }}</span><strong>v{{ current.version }}</strong></div>
    <p class="release-status" role="status" aria-live="polite">{{ status }}</p>
    <button v-if="available || failure" class="primary-button" :disabled="busy || checking" @click="emit('apply')"><Download :size="16" />{{ t(busy ? 'updating' : failure ? 'retryUpdate' : 'applyUpdate') }}</button>
    <button v-else class="secondary-button" :disabled="busy || checking" @click="emit('check')"><RefreshCw :size="16" />{{ t(checking ? 'checkingUpdate' : 'checkUpdates') }}</button>
  </section>
  <section class="release-history" :aria-label="t('releaseHistory')">
    <article v-for="release in localized" :key="release.version" class="release-entry">
      <div class="release-meta"><span>v{{ release.version }}<small v-if="release.version === current.version">{{ t('installed') }}</small></span><time :datetime="release.date">{{ date(release.date) }}</time></div>
      <h3>{{ release.title }}</h3>
      <ul><li v-for="change in release.changes" :key="change">{{ change }}</li></ul>
    </article>
  </section>
</template>
