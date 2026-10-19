<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowRight, ArrowUpRight, Check, CircleHelp, Menu, Grid2X2, Lightbulb, Moon, RotateCcw, Settings2, ScrollText, ShieldCheck, Sun, Undo2, Redo2 } from '@lucide/vue'
import { useAppUpdate } from './composables/useAppUpdate'
import releases from './data/releases.json'
import ReleaseNotes from './components/ReleaseNotes.vue'
import { useGameStore, puzzles } from './stores/game'
import { isComplete } from './engine/cipher'
import CipherBoard from './components/CipherBoard.vue'
import GameKeyboard from './components/GameKeyboard.vue'
import AppDialog from './components/AppDialog.vue'
import type { Difficulty } from './data/puzzles'
import type { Theme } from './services/storage'
import { keyboardAction } from './interaction/keyboard'

const game = useGameStore()
const cipher = ref<InstanceType<typeof CipherBoard>>()
const dialog = ref<'library' | 'help' | 'settings' | 'hint' | 'restart' | 'updates' | null>(null)
const menuOpen = ref(false)
const menuDialog = ref<InstanceType<typeof AppDialog>>()
let menuDestination: 'library' | 'help' | 'settings' | 'updates' | null = null
function openMenuPage(page: typeof menuDestination) { menuDestination = page; menuDialog.value?.requestClose() }
async function closeMenu() {
  menuOpen.value = false; await nextTick()
  const destination = menuDestination; menuDestination = null
  if (destination === 'updates') openUpdates(); else dialog.value = destination
}
const updatesHash = '#/updates'
let updatesOpenedHere = false
function openUpdates() { updatesOpenedHere = true; window.location.hash = updatesHash; syncUpdatesPage() }
function syncUpdatesPage() {
  if (updating.value && window.location.hash !== updatesHash) {
    window.history.replaceState(null, '', updatesHash); return
  }
  if (window.location.hash === updatesHash) dialog.value = 'updates'
  else if (dialog.value === 'updates') dialog.value = null
}
function closeUpdates() {
  if (updating.value) return
  if (updatesOpenedHere && window.location.hash === updatesHash) { updatesOpenedHere = false; window.history.back() }
  else { window.history.replaceState(null, '', window.location.pathname + window.location.search); dialog.value = null }
}
function enterLetter(letter: string) {
  if (!game.apply(letter) || game.complete) return
  const entered = game.message
  cipher.value?.advance()
  game.message = `${entered} ${game.message}`
}
const filter = ref<'All' | Difficulty>('All')
const index = computed(() => puzzles.findIndex(p => p.quote.id === game.currentId))
const number = computed(() => String(index.value + 1).padStart(3, '0'))
const filtered = computed(() => puzzles.filter(p => filter.value === 'All' || p.quote.difficulty === filter.value))
const isDark = ref(false)
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const { needRefresh, busy: updating, phase: updatePhase, failure: updateFailure, checking: checkingUpdate, result: updateResult, check: checkForUpdates, apply: applyUpdate } = useAppUpdate()
function applyTheme() {
  isDark.value = game.theme === 'dark' || (game.theme === 'system' && systemDark.matches)
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark.value ? '#1d211e' : '#f5f3ed')
}
watch(() => game.theme, applyTheme, { immediate: true })
function keyboard(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null
  if (dialog.value || menuOpen.value || !game.ready || target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return
  const action = keyboardAction(event)
  if (!action) return
  if (action.type === 'next' && !target?.closest('.cipher-cell')) return
  if (action.type === 'history') { event.preventDefault(); game.history(action.direction); return }
  if (game.complete) return
  event.preventDefault()
  if (action.type === 'layout-help') { game.feedback = 'Use the English layout or the on-screen keys.'; game.message = game.feedback }
  else if (action.type === 'navigate') cipher.value?.navigate(action.key)
  else if (action.type === 'letter') enterLetter(action.letter)
  else if (action.type === 'next') cipher.value?.advance()
  else game.apply('')
}
function choose(id: string) { game.switchPuzzle(id); dialog.value = null }
function nextPuzzle() { game.switchPuzzle(puzzles[(index.value + 1) % puzzles.length]!.quote.id) }
onMounted(() => { syncUpdatesPage(); window.addEventListener('hashchange', syncUpdatesPage); void game.initialize(); window.addEventListener('keydown', keyboard, true); systemDark.addEventListener('change', applyTheme) })
onBeforeUnmount(() => { window.removeEventListener('hashchange', syncUpdatesPage); window.removeEventListener('keydown', keyboard, true); systemDark.removeEventListener('change', applyTheme) })
</script>

<template>
  <div class="app-shell">
    <button class="icon-button menu-toggle" aria-label="Open menu" aria-haspopup="dialog" :aria-expanded="menuOpen" :aria-describedby="needRefresh ? 'update-available' : undefined" :disabled="updating" @click="menuOpen = true"><Menu :size="23" :stroke-width="1.5" /><span v-if="needRefresh" class="update-dot" aria-hidden="true"></span><span v-if="needRefresh" id="update-available" class="sr-only">Update available</span></button>
    <p v-if="!game.storageError" class="puzzle-meta"><span class="level-number">Nº {{ number }}</span><span>{{ game.puzzle.quote.difficulty }}</span></p>
    <div class="app-body" :inert="updating">
      <main id="main" class="main-content">
        <h1 class="sr-only">Cryptogram {{ number }}</h1>
        <div class="workspace">
          <section class="game-column" aria-label="Cryptogram game">
            <div class="puzzle-area">
              <div class="quote-region" :class="{ 'is-complete': game.complete }">
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
              <GameKeyboard v-if="!game.complete" @letter="enterLetter" @next="cipher?.advance()" />
              <button v-else class="resume-button" @click="nextPuzzle">Next puzzle <ArrowRight :size="17" /></button>
            </div>
          </section>
        </div>
        <div class="status-region sr-only" role="status" aria-live="polite" aria-atomic="true">{{ game.message }}</div>
        <p class="feedback-message">{{ game.feedback }}</p>
        <div v-if="game.storageError" class="storage-warning" role="alert">Progress can’t be saved. Keep this tab open.</div>
      </main>
    </div>

    <AppDialog v-if="menuOpen" ref="menuDialog" title="CODE." drawer @close="closeMenu">
      <nav class="drawer-menu" aria-label="Main navigation">
        <button class="drawer-item current-puzzle" @click="openMenuPage(null)"><span><strong>Current puzzle</strong><small>Nº {{ number }} · {{ game.puzzle.quote.difficulty }}</small><small>{{ game.puzzle.quote.author }}<br />{{ game.puzzle.quote.work }}, {{ game.puzzle.quote.year }}</small></span><ArrowRight :size="19" /></button>
        <button class="drawer-item" @click="openMenuPage('library')"><Grid2X2 :size="20" /><span>Puzzle collection</span><span class="menu-count">{{ puzzles.length }}</span></button>
        <button class="drawer-item" @click="openMenuPage('help')"><CircleHelp :size="20" /><span>How to play</span><ArrowUpRight :size="17" /></button>
        <button class="drawer-item" @click="openMenuPage('settings')"><Settings2 :size="20" /><span>Settings</span><ArrowUpRight :size="17" /></button>
        <button class="drawer-item" @click="openMenuPage('updates')"><ScrollText :size="20" /><span><strong>What’s new</strong><small v-if="needRefresh">Update available</small></span><span class="menu-count">v{{ releases[0]!.version }}</span></button>
      </nav>
      <button class="drawer-item theme-menu-item" :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'" @click="game.setTheme(isDark ? 'light' : 'dark')"><Sun v-if="isDark" :size="20" /><Moon v-else :size="20" /><span>{{ isDark ? 'Light appearance' : 'Dark appearance' }}</span></button>
    </AppDialog>

    <AppDialog v-if="dialog === 'updates'" title="What’s new" class="release-dialog" :busy="updating" @close="closeUpdates">
      <ReleaseNotes :available="needRefresh" :busy="updating" :checking="checkingUpdate" :phase="updatePhase" :failure="updateFailure" :result="updateResult" @check="checkForUpdates()" @apply="applyUpdate()" />
    </AppDialog>

    <AppDialog v-if="dialog === 'library'" title="Choose a puzzle" @close="dialog = null">
      <div class="filter-tabs" aria-label="Filter by difficulty"><button v-for="level in (['All', 'Easy', 'Medium', 'Hard'] as const)" :key="level" :class="{ chosen: filter === level }" :aria-pressed="filter === level" @click="filter = level">{{ level }}</button></div>
      <div class="puzzle-list"><button v-for="p in filtered" :key="p.quote.id" class="puzzle-list-item" :class="{ current: p.quote.id === game.currentId }" @click="choose(p.quote.id)"><span class="list-number">{{ String(puzzles.indexOf(p) + 1).padStart(2, '0') }}</span><span><strong>{{ p.quote.author }}</strong><small>{{ p.quote.difficulty }}<template v-if="isComplete(p, game.sessions[p.quote.id]!)"> · Decoded</template><template v-else-if="p.quote.id === game.currentId"> · Current</template></small></span><Check v-if="isComplete(p, game.sessions[p.quote.id]!)" :size="18" /><ArrowUpRight v-else :size="18" /></button></div>
    </AppDialog>

    <AppDialog v-if="dialog === 'help'" title="How to play" @close="dialog = null">
      <div class="help-demo" aria-hidden="true"><span><b>A</b><small>12</small></span><ArrowRight :size="18" /><span><b>A</b><small>12</small></span><span class="demo-caption">Same number.<br />Same letter.</span></div>
      <ol class="help-steps"><li><strong>Find the pattern.</strong><p>Each number stands for one letter. A few letters are already revealed.</p></li><li><strong>Enter a guess.</strong><p>Select a number, then a letter. Every matching number updates together. Selection moves to the next blank on the right, wrapping at the end. Each letter can belong to only one number.</p></li><li><strong>Check when you want.</strong><p>Guesses stay neutral. Check highlights mistakes, Hint reveals one letter, and undo works for both guesses and hints.</p></li></ol>
      <dl class="keyboard-shortcuts"><dt>A–Z</dt><dd>Enter a letter; non-Latin layouts use English key positions</dd><dt>← →</dt><dd>Previous / next editable cell</dd><dt>↑ ↓</dt><dd>Move between rows</dd><dt>Home / End</dt><dd>First / last editable cell</dd><dt>Enter</dt><dd>Next blank, wrapping at the end</dd><dt>Backspace / Delete</dt><dd>Erase selected number</dd><dt>Ctrl/⌘ Z · Shift Z</dt><dd>Undo · Redo</dd><dt>Tab</dt><dd>Move between the board and controls</dd></dl>
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
