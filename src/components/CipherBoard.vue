<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { isLocked } from '../engine/cipher'
import { navigationTarget } from '../interaction/navigation'
import type { NavigationKey } from '../interaction/navigation'
const game = useGameStore()
const board = ref<HTMLElement>()
const activeIndex = ref<number | null>(null)
const activeCellIndex = computed(() => {
  const matches = game.puzzle.words.flat().filter(cell => cell.symbol === game.selected)
  return matches.find(cell => cell.index === activeIndex.value)?.index ?? matches[0]?.index ?? null
})
function navigate(key: NavigationKey) {
  const buttons = [...(board.value?.querySelectorAll<HTMLButtonElement>('.cipher-cell') ?? [])]
  const target = navigationTarget(buttons.map(button => {
    const rect = button.getBoundingClientRect()
    return { index: Number(button.dataset.index), x: rect.left + rect.width / 2, y: rect.top, locked: button.dataset.locked === 'true' }
  }), activeCellIndex.value, key)
  buttons.find(button => Number(button.dataset.index) === target)?.focus({ preventScroll: true })
}
defineExpose({ navigate })
function choose(symbol: number, index: number, pulse = true) {
  activeIndex.value = index
  if (pulse && !game.complete && !isLocked(game.puzzle, game.session, symbol)) game.mode = 'solve'
  game.select(symbol, pulse)
  // Safari on macOS does not focus buttons on mouse click by default.
  if (pulse) board.value?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus({ preventScroll: true })
}
function revealSelection() {
  // Scroll only this board's parent region; never scroll the keyboard out of view.
  const active = board.value?.querySelector<HTMLElement>('[data-active="true"]') ?? board.value?.querySelector<HTMLElement>('[aria-pressed="true"]')
  const scroller = board.value?.closest<HTMLElement>('.play-scroll')
  if (!active || !scroller) return
  const cell = active.getBoundingClientRect(), region = scroller.getBoundingClientRect()
  if (cell.top < region.top + 16) scroller.scrollTop += cell.top - region.top - 24
  else if (cell.bottom > region.bottom - 16) scroller.scrollTop += cell.bottom - region.bottom + 24
  // A short desktop window may scroll the document; physical-key focus must stay visible.
  const visible = active.getBoundingClientRect()
  if (window.innerWidth > 700 && window.innerHeight > 580 && (visible.top < 0 || visible.bottom > window.innerHeight)) {
    active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }
}
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  const scroller = board.value?.closest<HTMLElement>('.play-scroll')
  if (scroller) { resizeObserver = new ResizeObserver(revealSelection); resizeObserver.observe(scroller) }
})
onBeforeUnmount(() => resizeObserver?.disconnect())
watch(() => game.currentId, () => { activeIndex.value = null })
watch(() => [game.selected, game.mode, game.currentId, activeIndex.value], async () => { await nextTick(); revealSelection() })
</script>

<template>
  <div ref="board" class="cipher-board" role="group" aria-label="Encrypted quotation" aria-description="Arrow keys move between editable letters. Type A to Z to enter a guess. Backspace erases.">
    <div v-for="(word, wi) in game.puzzle.words" :key="`${game.currentId}-${wi}`" class="cipher-word">
      <template v-for="cell in word" :key="cell.index">
        <button v-if="cell.symbol" type="button" inputmode="none" class="cipher-cell" :class="{ selected: game.selected === cell.symbol, clue: isLocked(game.puzzle, game.session, cell.symbol), filled: game.session.entries[cell.symbol], mistake: game.checked.includes(cell.symbol) }"
          :aria-label="`Number ${cell.symbol}${game.session.entries[cell.symbol] ? ', letter ' + game.session.entries[cell.symbol] : ', blank'}${isLocked(game.puzzle, game.session, cell.symbol) ? ', revealed clue' : ''}${game.checked.includes(cell.symbol) ? ', checked mistake' : ''}`"
          :aria-pressed="game.selected === cell.symbol" :data-index="cell.index" :data-locked="isLocked(game.puzzle, game.session, cell.symbol)" :data-active="activeCellIndex === cell.index" :tabindex="activeCellIndex === cell.index ? 0 : -1" :disabled="!game.ready" @focus="choose(cell.symbol, cell.index, false)" @click="choose(cell.symbol, cell.index)">
          <span class="cell-letter" :key="game.session.entries[cell.symbol] || 'blank'">{{ game.session.entries[cell.symbol] || '\u00a0' }}</span>
          <span class="cell-number">{{ cell.symbol }}</span>
          <span v-if="game.checked.includes(cell.symbol)" class="mistake-dot" aria-hidden="true">•</span>
        </button>
        <span v-else class="punctuation" aria-hidden="true">{{ cell.punctuation }}</span>
      </template>
    </div>
  </div>
</template>
