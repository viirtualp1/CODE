<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Check } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/game'
import { progressStatus } from '../engine/collection'
import type { ProgressStatus } from '../engine/collection'
import type { Difficulty } from '../data/puzzles'
const emit = defineEmits<{ choose: [id: string] }>()
const game = useGameStore()
const { t } = useI18n()
const difficulty = ref<'All' | Difficulty>('All')
const status = ref<'all' | ProgressStatus>('all')
const entries = computed(() => game.collection.map((puzzle, index) => ({ puzzle, number: String(index + 1).padStart(3, '0'), status: progressStatus(puzzle, game.sessions[puzzle.quote.id]!) })))
const filtered = computed(() => entries.value.filter(entry => (difficulty.value === 'All' || entry.puzzle.quote.difficulty === difficulty.value) && (status.value === 'all' || entry.status === status.value)))
const resume = computed(() => entries.value.find(entry => entry.puzzle.quote.id === game.currentId && entry.status === 'started') ?? entries.value.find(entry => entry.status === 'started'))
</script>
<template>
  <div class="filter-tabs" :aria-label="t('filter')"><button v-for="level in (['All', 'Easy', 'Medium', 'Hard'] as const)" :key="level" :class="{ chosen: difficulty === level }" :aria-pressed="difficulty === level" @click="difficulty = level">{{ t('difficulty.' + level) }}</button></div>
  <div class="collection-controls">
    <button v-if="resume" class="text-button collection-resume" @click="emit('choose', resume.puzzle.quote.id)">{{ t('resumeNumber', { number: resume.number }) }} <ArrowRight :size="16" /></button>
    <select v-model="status" :aria-label="t('progressFilter')"><option v-for="value in (['all', 'new', 'started', 'complete'] as const)" :key="value" :value="value">{{ t('progress.' + value) }}</option></select>
  </div>
  <div class="puzzle-list">
    <button v-for="entry in filtered" :key="entry.puzzle.quote.id" class="puzzle-list-item" :class="{ current: entry.puzzle.quote.id === game.currentId }" :aria-current="entry.puzzle.quote.id === game.currentId ? 'true' : undefined" @click="emit('choose', entry.puzzle.quote.id)">
      <span class="list-number">{{ entry.number }}</span>
      <span><strong>{{ entry.puzzle.quote.author }}</strong><span class="library-work">{{ entry.puzzle.quote.work }}</span><small>{{ t('difficulty.' + entry.puzzle.quote.difficulty) }} · {{ t('progress.' + entry.status) }}<template v-if="entry.puzzle.quote.id === game.currentId"> · {{ t('current') }}</template></small></span>
      <Check v-if="entry.status === 'complete'" :size="18" /><ArrowRight v-else :size="18" />
    </button>
  </div>
  <div v-if="!filtered.length" class="collection-empty" role="status"><p>{{ t('noPuzzles') }}</p><button class="text-button" @click="difficulty = 'All'; status = 'all'">{{ t('clearFilters') }}</button></div>
</template>
