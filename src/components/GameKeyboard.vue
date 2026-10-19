<script setup lang="ts">
import { CornerDownLeft, Delete } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/game'
const emit = defineEmits<{ letter: [letter: string]; next: []; erase: [] }>()
const game = useGameStore()
const { t } = useI18n()
const rows = computed(() => game.language === 'ru' ? ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮЁ'] : ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'])
const assigned = (letter: string) => Object.entries(game.session.entries).find(([, value]) => value === letter)?.[0]
</script>
<template>
  <div class="keyboard" :class="{ 'keyboard--ru': game.language === 'ru' }" :aria-label="t('letterKeyboard')">
    <div v-for="(row, index) in rows" :key="row" class="key-row" :class="`key-row-${index}`">
      <button type="button" v-for="letter in row" :key="letter" class="key letter-key" :class="{ used: assigned(letter), current: game.selected && game.session.entries[game.selected] === letter }" :disabled="game.locked || game.complete || !game.ready" :aria-label="assigned(letter) ? t('assignedKey', { letter, number: assigned(letter)! }) : letter" @click="emit('letter', letter)">
        {{ letter }}<span v-if="assigned(letter)" class="used-mark" aria-hidden="true"></span>
      </button>
      <button type="button" v-if="index === 1" class="key special-key erase-key" :aria-label="t(game.checked.length ? 'eraseMistake' : 'erase')" :disabled="(!game.checked.length && game.locked) || game.complete || !game.ready" @click="emit('erase')"><Delete :size="20" :stroke-width="1.5" /></button>
      <button type="button" v-if="index === 2" class="key special-key next-key" :aria-label="t('nextNumber')" :disabled="game.complete || !game.ready" @click="emit('next')"><CornerDownLeft :size="20" :stroke-width="1.5" /></button>
    </div>
  </div>
</template>
