<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, CircleHelp, Command, Grid2X2, Lightbulb, Moon, RotateCcw, Settings2, ShieldCheck, Sun, Undo2, Redo2 } from '@lucide/vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useGameStore, puzzles } from './stores/game'
import { isComplete } from './engine/cipher'
import CipherBoard from './components/CipherBoard.vue'
import GameKeyboard from './components/GameKeyboard.vue'
import AppDialog from './components/AppDialog.vue'
import type { Difficulty } from './data/puzzles'
import { flushWrites } from './services/storage'
import type { Theme } from './services/storage'
import { keyboardAction } from './interaction/keyboard'

const game = useGameStore()
const cipher = ref<InstanceType<typeof CipherBoard>>()
const dialog = ref<'library' | 'help' | 'settings' | 'hint' | 'restart' | null>(null)
const filter = ref<'All' | Difficulty>('All')
const index = computed(() => puzzles.findIndex(p => p.quote.id === game.currentId))
const number = computed(() => String(index.value + 1).padStart(3, '0'))
const filtered = computed(() => puzzles.filter(p => filter.value === 'All' || p.quote.difficulty === filter.value))
const isDark = ref(false)
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const { needRefresh, updateServiceWorker } = useRegisterSW()
function applyTheme() {
  isDark.value = game.theme === 'dark' || (game.theme === 'system' && systemDark.matches)
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark.value ? '#1d211e' : '#f5f3ed')
}
watch(() => game.theme, applyTheme, { immediate: true })
function keyboard(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null
  if (dialog.value || !game.ready || target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return
  const action = keyboardAction(event)
  if (!action) return
  if (action.type === 'history') { event.preventDefault(); game.history(action.direction); return }
  if (game.complete) return
  // Focusing a cipher cell is an editing intent, even if Read was previously active.
  if (game.mode === 'read') {
    if (!target?.closest('.cipher-cell')) return
    game.mode = 'solve'
  }
  event.preventDefault()
  if (action.type === 'layout-help') { game.feedback = 'Use the English layout or the on-screen keys.'; game.message = game.feedback }
  else if (action.type === 'navigate') cipher.value?.navigate(action.key)
  else if (action.type === 'letter') game.apply(action.letter)
  else game.apply('')
}
async function refreshEdition() {
  try { await flushWrites(); await updateServiceWorker(true) }
  catch { game.storageError = true; game.message = 'Progress could not be saved. The current edition is still open.' }
}
function choose(id: string) { game.switchPuzzle(id); dialog.value = null }
function nextPuzzle() { game.switchPuzzle(puzzles[(index.value + 1) % puzzles.length]!.quote.id) }
onMounted(() => { void game.initialize(); window.addEventListener('keydown', keyboard, true); systemDark.addEventListener('change', applyTheme) })
onBeforeUnmount(() => { window.removeEventListener('keydown', keyboard, true); systemDark.removeEventListener('change', applyTheme) })
</script>

<template>
  <div class="app-shell">
    <nav class="side-rail" aria-label="Main navigation">
      <a href="#main" class="brand-symbol" aria-label="CODE, go to puzzle"><span>C</span><i></i></a>
      <div class="rail-actions">
        <button class="rail-button active" aria-label="Current puzzle" aria-current="page" @click="dialog = null; game.mode = game.complete ? 'read' : 'solve'"><Command :size="23" :stroke-width="1.4" /></button>
        <button class="rail-button" aria-label="Open puzzle collection" @click="dialog = 'library'"><Grid2X2 :size="21" :stroke-width="1.4" /></button>
        <button class="rail-button" aria-label="How to play" @click="dialog = 'help'"><CircleHelp :size="22" :stroke-width="1.4" /></button>
      </div>
      <button class="rail-button rail-settings" aria-label="Open settings" @click="dialog = 'settings'"><Settings2 :size="22" :stroke-width="1.4" /></button>
    </nav>

    <div class="app-body">
      <header class="masthead">
        <a class="wordmark" href="#main" aria-label="CODE home">CODE<span class="wordmark-dot">.</span></a>
        <div class="header-actions">
          <button class="icon-button mobile-action" aria-label="Open puzzle collection" @click="dialog = 'library'"><Grid2X2 :size="19" /></button>
          <button class="icon-button theme-button" :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'" @click="game.setTheme(isDark ? 'light' : 'dark')"><Sun v-if="isDark" :size="20" :stroke-width="1.5" /><Moon v-else :size="20" :stroke-width="1.5" /></button>
          <button class="icon-button mobile-action" aria-label="How to play" @click="dialog = 'help'"><CircleHelp :size="19" :stroke-width="1.5" /></button>
          <button class="icon-button mobile-action" aria-label="Open settings" @click="dialog = 'settings'"><Settings2 :size="19" /></button>
        </div>
      </header>

      <main id="main" class="main-content">
        <h1 class="sr-only">Cryptogram {{ number }}</h1>
        <div class="workspace">
          <section class="game-column" aria-label="Cryptogram game" :class="{ 'reading-mode': game.mode === 'read' }">
            <div class="puzzle-paper">
              <div class="puzzle-topline">
                <div class="puzzle-identifier"><span class="eyebrow">Nº {{ number }}</span><span class="thin-divider"></span><span class="difficulty"><span class="difficulty-bars" aria-hidden="true"><i></i><i :class="{ lit: game.puzzle.quote.difficulty !== 'Easy' }"></i><i :class="{ lit: game.puzzle.quote.difficulty === 'Hard' }"></i></span>{{ game.puzzle.quote.difficulty }}</span></div>
                <button class="text-button paper-menu" aria-label="Choose a different puzzle" @click="dialog = 'library'">{{ String(index + 1).padStart(2, '0') }} <span>/ 06</span><ChevronDown :size="14" /></button>
              </div>
              <div class="play-scroll" :class="{ 'is-complete': game.complete }">
                <CipherBoard ref="cipher" />
                <div class="attribution"><span class="attribution-line"></span><div><span class="author">{{ game.puzzle.quote.author }}</span><span class="work-title">{{ game.puzzle.quote.work }}, {{ game.puzzle.quote.year }}</span></div></div>
                <div v-if="game.complete" class="completion-note"><Check :size="17" /> Decoded</div>
              </div>
              <div class="puzzle-toolbar">
                <div class="history-tools">
                  <button class="icon-button" aria-label="Undo last move" title="Undo · Ctrl/⌘ Z" :disabled="!game.ready || !game.session.undo.length" @click="game.history('undo')"><Undo2 :size="20" :stroke-width="1.5" /></button>
                  <button class="icon-button" aria-label="Redo last move" title="Redo · Ctrl/⌘ Shift Z" :disabled="!game.ready || !game.session.redo.length" @click="game.history('redo')"><Redo2 :size="20" :stroke-width="1.5" /></button>
                  <span class="toolbar-divider"></span><button class="icon-button" aria-label="Restart this puzzle" title="Restart" :disabled="!game.ready" @click="dialog = 'restart'"><RotateCcw :size="17" :stroke-width="1.5" /></button>
                </div>
                <div class="assistance-tools"><button class="tool-button" :disabled="!game.hintTarget || !game.ready" @click="dialog = 'hint'"><Lightbulb :size="18" :stroke-width="1.5" /><span>Hint</span></button><button class="tool-button check-button" :disabled="game.complete || !game.ready" @click="game.check()"><ShieldCheck :size="18" :stroke-width="1.5" /><span>Check</span></button></div>
              </div>
            </div>

            <div class="input-deck">
              <div class="mode-bar">
                <div class="mode-switch" aria-label="Puzzle view"><button :class="{ chosen: game.mode === 'solve' }" :aria-pressed="game.mode === 'solve'" :disabled="game.complete" @click="game.mode = 'solve'"><Command :size="14" /> Solve</button><button :class="{ chosen: game.mode === 'read' }" :aria-pressed="game.mode === 'read'" @click="game.mode = 'read'"><BookOpen :size="15" /> Read</button></div>
                <span v-if="game.mode === 'solve'" class="selection-label" :aria-label="game.selected ? `Selected number ${game.selected}` : 'Select a number'">{{ game.selected ?? 'Select a number' }}<template v-if="game.selected"><ArrowRight :size="12" /><strong>{{ game.session.entries[game.selected] || '?' }}</strong></template></span>
              </div>
              <GameKeyboard v-if="game.mode === 'solve'" />
              <button v-else-if="game.complete" class="resume-button" @click="nextPuzzle">Next puzzle <ArrowRight :size="17" /></button><button v-else class="resume-button" @click="game.mode = 'solve'">Continue solving <ArrowRight :size="17" /></button>
              <div v-if="game.mode === 'solve'" class="input-caption"><span class="physical-keyboard">A–Z to enter<span>·</span>← ↑ ↓ → to move<span>·</span>Backspace to erase</span></div>
            </div>
          </section>
        </div>
        <div class="status-region sr-only" role="status" aria-live="polite" aria-atomic="true">{{ game.message }}</div>
        <p class="feedback-message">{{ game.feedback }}</p>
        <div v-if="game.storageError" class="storage-warning" role="alert">Progress cannot be saved on this device. Keep this tab open to continue.</div>
        <div v-if="needRefresh" class="update-notice">An update is ready.<button class="text-button" @click="refreshEdition()">Save &amp; refresh <ArrowDown :size="15" /></button><button class="text-button" @click="needRefresh = false">Later</button></div>
      </main>
    </div>

    <AppDialog v-if="dialog === 'library'" title="Choose a puzzle" @close="dialog = null">
      <div class="filter-tabs" aria-label="Filter by difficulty"><button v-for="level in (['All', 'Easy', 'Medium', 'Hard'] as const)" :key="level" :class="{ chosen: filter === level }" :aria-pressed="filter === level" @click="filter = level">{{ level }}</button></div>
      <div class="puzzle-list"><button v-for="p in filtered" :key="p.quote.id" class="puzzle-list-item" :class="{ current: p.quote.id === game.currentId }" @click="choose(p.quote.id)"><span class="list-number">{{ String(puzzles.indexOf(p) + 1).padStart(2, '0') }}</span><span><strong>{{ p.quote.author }}</strong><small>{{ p.quote.difficulty }}<template v-if="isComplete(p, game.sessions[p.quote.id]!)"> · Decoded</template><template v-else-if="p.quote.id === game.currentId"> · Current</template></small></span><Check v-if="isComplete(p, game.sessions[p.quote.id]!)" :size="18" /><ArrowUpRight v-else :size="18" /></button></div>
    </AppDialog>

    <AppDialog v-if="dialog === 'help'" title="How to play" @close="dialog = null">
      <div class="help-demo" aria-hidden="true"><span><b>A</b><small>12</small></span><ArrowRight :size="18" /><span><b>A</b><small>12</small></span><span class="demo-caption">Same number.<br />Same letter.</span></div>
      <ol class="help-steps"><li><strong>Find the pattern.</strong><p>Each number stands for one letter. A few letters are already revealed.</p></li><li><strong>Enter a guess.</strong><p>Select a number, then a letter. Every matching number updates together. Each letter can belong to only one number.</p></li><li><strong>Check when you want.</strong><p>Guesses stay neutral. Check highlights mistakes, Hint reveals one letter, and undo works for both guesses and hints.</p></li></ol>
      <p class="dialog-footnote">Read hides the keyboard without revealing the answer. Select an editable cell to continue solving.</p>
      <dl class="keyboard-shortcuts"><dt>A–Z</dt><dd>Enter a letter; non-Latin layouts use English key positions</dd><dt>← →</dt><dd>Previous / next editable cell</dd><dt>↑ ↓</dt><dd>Move between rows</dd><dt>Home / End</dt><dd>First / last editable cell</dd><dt>Backspace / Delete</dt><dd>Erase selected number</dd><dt>Ctrl/⌘ Z · Shift Z</dt><dd>Undo · Redo</dd><dt>Tab</dt><dd>Move between the board and controls</dd></dl>
      <button class="primary-button" @click="dialog = null">Got it <Check :size="17" /></button>
    </AppDialog>

    <AppDialog v-if="dialog === 'settings'" title="Settings" @close="dialog = null">
      <div class="setting-row"><label for="theme">Appearance</label><select id="theme" :value="game.theme" @change="game.setTheme(($event.target as HTMLSelectElement).value as Theme)"><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
      <div class="setting-row"><label for="haptics">Haptics<small>On supported devices.</small></label><input id="haptics" class="toggle-input" type="checkbox" :checked="game.haptics" @change="game.setHaptics(($event.target as HTMLInputElement).checked)" /></div>
      <p class="dialog-footnote">No accounts or tracking. Progress stays on this device.</p>
    </AppDialog>

    <AppDialog v-if="dialog === 'hint'" title="Reveal a letter?" @close="dialog = null">
      <p class="dialog-description">Reveal number {{ game.hintTarget }} everywhere in the quote. You can undo this hint.</p>
      <div class="dialog-buttons"><button class="secondary-button" @click="dialog = null">Cancel</button><button class="primary-button" @click="game.revealHint(); dialog = null">Reveal letter <Lightbulb :size="17" /></button></div>
    </AppDialog>

    <AppDialog v-if="dialog === 'restart'" title="Restart this puzzle?" @close="dialog = null">
      <p class="dialog-description">Clear guesses, hints and move history. Starting clues will stay.</p>
      <div class="dialog-buttons"><button class="secondary-button" @click="dialog = null">Cancel</button><button class="primary-button" @click="game.restart(); dialog = null">Restart <RotateCcw :size="17" /></button></div>
    </AppDialog>
  </div>
</template>
