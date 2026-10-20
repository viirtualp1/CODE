<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Upload } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useGameStore, puzzles } from '../stores/game'
import { createBackup, MAX_BACKUP_BYTES, parseBackup, planRestore } from '../services/backup'
import type { ParsedBackup } from '../services/backup'
import releases from '../data/releases.json'
const game = useGameStore()
const { t, locale } = useI18n()
const input = ref<HTMLInputElement>()
const incoming = ref<ParsedBackup | null>(null)
const replace = ref(false)
const loading = ref(false)
const feedback = ref('')
const failure = ref(false)
const discardLocal = ref(false)
async function loadSaved() {
  if (!discardLocal.value) return
  if (await game.syncProgress(true)) { discardLocal.value = false; incoming.value = null; feedback.value = t('progressSynced'); failure.value = false }
  else { failure.value = true; feedback.value = t('backup.restoreFailure') }
}
const plan = computed(() => incoming.value ? planRestore(puzzles, game.sessions, incoming.value, replace.value) : null)
const date = computed(() => incoming.value ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(incoming.value.createdAt)) : '')
function exportProgress() {
  try {
    const backup = createBackup(puzzles, game.sessions, releases[0]!.version, game.resumePointers)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    if (blob.size > MAX_BACKUP_BYTES) throw new Error('Backup too large')
    const url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = `CODE-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    failure.value = false; feedback.value = t('backup.exported')
  } catch { failure.value = true; feedback.value = t('backup.exportFailure') }
}
async function selectFile(event: Event) {
  const element = event.target as HTMLInputElement, file = element.files?.[0]
  if (!file) return
  loading.value = true; incoming.value = null; feedback.value = ''; replace.value = false
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup too large')
    incoming.value = parseBackup(await file.text(), puzzles)
    failure.value = false
  } catch { failure.value = true; feedback.value = t('backup.invalid') }
  finally { loading.value = false; element.value = '' }
}
async function restore() {
  if (!incoming.value || !plan.value || !(plan.value.added + plan.value.replaced)) return
  const success = await game.restoreProgress(incoming.value, replace.value)
  failure.value = !success; feedback.value = t(success ? 'backup.restored' : 'backup.restoreFailure')
  if (success) { incoming.value = null; replace.value = false }
}
</script>
<template>
  <section class="backup-section" :aria-label="t('backup.title')">
    <h3>{{ t('backup.title') }}</h3><p class="dialog-footnote">{{ t('backup.description') }}</p>
    <div v-if="game.storageConflict" class="backup-conflict" role="alert">
      <p>{{ t('progressConflictDetails') }}</p>
      <label class="backup-replace"><input v-model="discardLocal" type="checkbox" :disabled="game.syncing" /><span>{{ t('progressDiscardConfirm') }}</span></label>
      <button class="secondary-button" :disabled="!discardLocal || game.syncing || !!game.pendingSaves" @click="loadSaved">{{ t('progressLoadSaved') }}</button>
    </div>
    <div class="backup-actions"><button class="secondary-button" :disabled="!game.ready || game.restoring || loading" @click="exportProgress"><Download :size="17" />{{ t('backup.export') }}</button><button class="secondary-button" :disabled="!game.ready || game.restoring || loading" @click="input?.click()"><Upload :size="17" />{{ t('backup.import') }}</button></div>
    <input ref="input" class="sr-only" type="file" accept=".json,application/json" tabindex="-1" :aria-label="t('backup.file')" :disabled="game.restoring || loading" @change="selectFile" />
    <p v-if="loading" class="dialog-footnote" role="status">{{ t('backup.reading') }}</p>
    <div v-if="incoming && plan" class="backup-preview">
      <p>{{ t('backup.fromDate', { date }) }}</p>
      <dl><dt>{{ t('backup.added') }}</dt><dd>{{ plan.added }}</dd><dt>{{ t('backup.replaced') }}</dt><dd>{{ plan.replaced }}</dd><dt>{{ t('backup.kept') }}</dt><dd>{{ plan.kept }}</dd><template v-if="plan.unavailable"><dt>{{ t('backup.unavailable') }}</dt><dd>{{ plan.unavailable }}</dd></template></dl>
      <label class="backup-replace"><input v-model="replace" type="checkbox" :disabled="game.restoring" /><span>{{ t('backup.replace') }}</span></label>
      <p class="dialog-footnote">{{ t('backup.confirmation') }}</p>
      <div class="dialog-buttons"><button class="secondary-button" :disabled="game.restoring" @click="incoming = null">{{ t('cancel') }}</button><button class="primary-button" :disabled="game.restoring || game.syncing || game.storageConflict || !(plan.added + plan.replaced)" @click="restore">{{ t(game.restoring ? 'backup.restoring' : 'backup.restore') }}</button></div>
    </div>
    <p v-if="feedback" class="backup-feedback" :class="{ failure }" role="status">{{ feedback }}</p>
  </section>
</template>
