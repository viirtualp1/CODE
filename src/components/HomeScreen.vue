<script setup lang="ts">
import { ArrowRight, Settings2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
defineProps<{ hasProgress: boolean; ready: boolean }>()
const emit = defineEmits<{ play: []; help: [event: MouseEvent]; settings: [event: MouseEvent] }>()
const { t } = useI18n()
</script>
<template>
  <main class="home-screen" :aria-busy="!ready">
    <button class="icon-button home-settings" :aria-label="t('settings')" :disabled="!ready" @click="emit('settings', $event)"><Settings2 :size="23" :stroke-width="1.5" /></button>
    <div class="home-content">
      <div class="home-identity"><h1>CODE<span>.</span></h1><p>{{ t('cryptograms') }}</p></div>
      <div class="home-actions">
        <button class="primary-button home-play" :disabled="!ready" @click="emit('play')"><span>{{ t(hasProgress ? 'continue' : 'play') }}</span><ArrowRight :size="20" :stroke-width="1.7" /></button>
        <button class="home-help" :disabled="!ready" @click="emit('help', $event)">{{ t('help') }}</button>
      </div>
    </div>
  </main>
</template>
