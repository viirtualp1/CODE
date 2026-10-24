<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Delete, Undo2, ArrowRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { edit, initialSession, isComplete, isLocked, mistakes, nextEmptyCell, travel } from '../engine/cipher'
import { tutorialPuzzle } from '../engine/tutorial'
import { keyboardAction } from '../interaction/keyboard'
import type { Locale } from '../i18n'
const props = defineProps<{ language: Locale; hasProgress: boolean }>()
const emit = defineEmits<{ play: []; close: [] }>()
const { t } = useI18n()
const puzzle = computed(() => tutorialPuzzle(props.language))
const session = ref(initialSession(puzzle.value))
const first = () => puzzle.value.words.flat().find(cell => cell.symbol && !puzzle.value.clues[cell.symbol])!.index
const active = ref(first())
const board = ref<HTMLElement>()
const checked = ref<number[]>([])
const message = ref('')
const complete = computed(() => isComplete(puzzle.value, session.value))
const symbol = computed(() => puzzle.value.words.flat().find(cell => cell.index === active.value)?.symbol ?? null)
const keys = computed(() => props.language === 'en' ? ['O', 'H', 'A'] : ['О', 'К', 'А'])
function reset() { session.value = initialSession(puzzle.value); active.value = first(); checked.value = []; message.value = ''; focusCell() }
watch(() => props.language, reset)
function focusCell() { void nextTick(() => board.value?.querySelector<HTMLButtonElement>(`[data-index="${active.value}"]`)?.focus({ preventScroll: true })) }
function enter(letter: string) {
  const result = edit(puzzle.value, session.value, symbol.value, letter)
  if (!result.changed) { message.value = result.reason ? t(result.reason, result.reasonParams ?? {}) : ''; return }
  session.value = result.session; checked.value = []
  message.value = t(isComplete(puzzle.value, session.value) ? 'tutorialSolved' : 'tutorialMatched')
  const next = nextEmptyCell(puzzle.value, session.value, active.value)
  if (letter && next) active.value = next.index
  focusCell()
}
function undo() { session.value = travel(session.value, 'undo'); checked.value = []; message.value = t('undone') }
function check() {
  checked.value = mistakes(puzzle.value, session.value)
  const guesses = Object.keys(session.value.entries).length - Object.keys(puzzle.value.clues).length
  message.value = t(checked.value.length ? 'checkMistakes' : guesses ? 'checkGood' : 'checkEmpty', { count: checked.value.length })
}
function keydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.tutorial-board')) return
  const action = keyboardAction(event, props.language)
  if (!action) return
  event.preventDefault()
  if (action.type === 'letter') enter(action.letter)
  else if (action.type === 'erase') enter('')
  else if (action.type === 'history' && action.direction === 'undo') undo()
  else if (action.type === 'next' || action.type === 'navigate') {
    const cells = puzzle.value.words.flat().filter(cell => cell.symbol && !puzzle.value.clues[cell.symbol])
    const index = cells.findIndex(cell => cell.index === active.value)
    const backward = action.type === 'navigate' && ['ArrowLeft', 'ArrowUp', 'Home'].includes(action.key)
    active.value = cells[(index + (backward ? cells.length - 1 : 1)) % cells.length]!.index; focusCell()
  }
}
</script>
<template>
  <section class="tutorial" @keydown="keydown">
    <h3>{{ t('tutorialRule') }}</h3>
    <p class="tutorial-intro">{{ t('tutorialPrompt') }}</p>
    <div ref="board" class="tutorial-board cipher-board" role="group" :aria-label="t('boardLabel')" aria-describedby="practice-instructions">
      <span v-for="(word, index) in puzzle.words" :key="index" class="cipher-word">
        <template v-for="cell in word" :key="cell.index">
          <button v-if="cell.symbol" class="cipher-cell" :class="{ clue: isLocked(puzzle, session, cell.symbol), selected: symbol === cell.symbol, mistake: checked.includes(cell.symbol) }" :data-index="cell.index" :tabindex="active === cell.index ? 0 : -1" :aria-disabled="isLocked(puzzle, session, cell.symbol)" :aria-pressed="symbol === cell.symbol" :aria-label="(session.entries[cell.symbol] ? t('cellLetter', { number: cell.symbol, letter: session.entries[cell.symbol] }) : t('cellBlank', { number: cell.symbol })) + (isLocked(puzzle, session, cell.symbol) ? t('clueSuffix') : '') + (checked.includes(cell.symbol) ? t('mistakeSuffix') : '')" @click="active = cell.index; focusCell()">
            <span class="cell-letter">{{ session.entries[cell.symbol] || '\u00a0' }}</span><span class="cell-number">{{ cell.symbol }}</span><span v-if="checked.includes(cell.symbol)" class="mistake-dot" aria-hidden="true">•</span>
          </button><span v-else class="punctuation" aria-hidden="true">{{ cell.punctuation }}</span>
        </template>
      </span>
    </div>
    <p id="practice-instructions" class="tutorial-instructions">{{ t('tutorialInstructions') }}</p>
    <div class="practice-keys" role="group" :aria-label="t('letterKeyboard')"><button v-for="letter in keys" :key="letter" class="key" :disabled="complete || !symbol || isLocked(puzzle, session, symbol)" @click="enter(letter)">{{ letter }}</button></div>
    <div class="practice-tools"><button class="icon-button" :aria-label="t('undo')" :disabled="!session.undo.length" @click="undo"><Undo2 :size="20" /></button><button class="icon-button" :aria-label="t('erase')" :disabled="!symbol || isLocked(puzzle, session, symbol) || !session.entries[symbol]" @click="enter('')"><Delete :size="20" /></button><button class="tool-button" @click="check"><Check :size="18" />{{ t('check') }}</button></div>
    <p class="practice-message" role="status" aria-live="polite" aria-atomic="true">{{ message }}</p>
    <p class="tutorial-instructions">{{ t('tutorialCheck') }}</p>
    <div class="tutorial-actions"><button class="primary-button" @click="emit('play')">{{ t(hasProgress ? 'continue' : 'play') }}<ArrowRight :size="18" /></button><button class="text-button" @click="complete ? reset() : emit('close')">{{ t(complete ? 'practiceAgain' : 'skipTutorial') }}</button></div>
  </section>
</template>
