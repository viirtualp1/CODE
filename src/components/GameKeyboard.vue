<script setup lang="ts">
import { ArrowRight, Delete } from '@lucide/vue'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const assigned = (letter: string) => Object.entries(game.session.entries).find(([, value]) => value === letter)?.[0]
</script>
<template>
  <div class="keyboard" aria-label="Letter keyboard">
    <div v-for="(row, index) in rows" :key="row" class="key-row" :class="`key-row-${index}`">
      <button type="button" v-if="index === 2" class="key special-key erase-key" aria-label="Erase selected number" :disabled="game.locked || game.complete || !game.ready" @click="game.apply('')"><Delete :size="20" :stroke-width="1.5" /></button>
      <button type="button" v-for="letter in row" :key="letter" class="key letter-key" :class="{ used: assigned(letter), current: game.selected && game.session.entries[game.selected] === letter }" :disabled="game.locked || game.complete || !game.ready" :aria-label="`${letter}${assigned(letter) ? ', assigned to number ' + assigned(letter) : ''}`" @click="game.apply(letter)">
        {{ letter }}<span v-if="assigned(letter)" class="used-mark" aria-hidden="true"></span>
      </button>
      <button type="button" v-if="index === 2" class="key special-key next-key" aria-label="Select next unanswered number" :disabled="game.complete || !game.ready" @click="game.next()"><ArrowRight :size="20" :stroke-width="1.5" /></button>
    </div>
  </div>
</template>
