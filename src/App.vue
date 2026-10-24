<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowRight, ArrowUpRight, CircleHelp, Menu, Grid2X2, Lightbulb, House, RotateCcw, Settings2, ScrollText, ShieldCheck, Undo2, Redo2 } from '@lucide/vue'
import { useAppUpdate } from './composables/useAppUpdate'
import releases from './data/releases.json'
import ReleaseNotes from './components/ReleaseNotes.vue'
import { useI18n } from 'vue-i18n'
import type { Locale } from './i18n'
import { useGameStore } from './stores/game'
import { nextPuzzleId } from './engine/collection'
import PuzzleLibrary from './components/PuzzleLibrary.vue'
import ProgressBackup from './components/ProgressBackup.vue'
import CipherBoard from './components/CipherBoard.vue'
import GameKeyboard from './components/GameKeyboard.vue'
import AppDialog from './components/AppDialog.vue'
import HomeScreen from './components/HomeScreen.vue'
import AppearanceControl from './components/AppearanceControl.vue'
import TutorialGame from './components/TutorialGame.vue'
import { connectAppearance } from './services/appearance'
import { destinations, destinationFor, isSecondary, launchDestination } from './interaction/routes'
import type { Destination } from './interaction/routes'
import { keyboardAction } from './interaction/keyboard'

const game = useGameStore()
const { t } = useI18n()
const puzzles = computed(() => game.collection)
const cipher = ref<InstanceType<typeof CipherBoard>>()
const completionButton = ref<HTMLButtonElement>()
const animateCompletion = ref(false)
const dialog = ref<'library' | 'help' | 'settings' | 'hint' | 'restart' | 'updates' | null>(null)
const launch = launchDestination(window.location.pathname, window.location.hash)
window.history.replaceState(window.history.state, '', destinations[launch] + window.location.search)
const screen = ref<'home' | 'game'>(launch === 'game' ? 'game' : 'home')
const menuOpen = ref(false)
const menuButton = ref<HTMLElement>()
const pageReturnFocus = ref<HTMLElement>()
const menuDialog = ref<InstanceType<typeof AppDialog>>()
let menuDestination: Destination | null = null
let returnHomeAfterMenu = false
const phoneQuery = window.matchMedia('(max-width: 700px), (max-height: 580px) and (orientation: landscape)')
const isPhone = ref(phoneQuery.matches)
const isPage = computed(() => isPhone.value && dialog.value !== null && ['library', 'help', 'settings', 'updates'].includes(dialog.value))
function navigate(destination: Destination, replace = false) {
  window.history[replace ? 'replaceState' : 'pushState']({ codeOverlay: isSecondary(destination) || destination === 'menu', codeOrigin: screen.value }, '', destinations[destination])
  syncPage()
}
function openPage(page: 'library' | 'help' | 'settings' | 'updates', event?: MouseEvent) {
  pageReturnFocus.value = event?.currentTarget instanceof HTMLElement ? event.currentTarget : menuButton.value
  navigate(page)
}
function openMenuPage(page: Destination | null) { menuDestination = page; menuDialog.value?.requestClose() }
function closeMenu() {
  const destination = menuDestination; menuDestination = null
  if (destination === 'home' && window.history.state?.codeOverlay) { returnHomeAfterMenu = true; window.history.back() }
  else if (destination) { pageReturnFocus.value = menuButton.value; navigate(destination, true) }
  else closePage()
}
function syncPage() {
  if (returnHomeAfterMenu) { returnHomeAfterMenu = false; navigate('home', true); return }
  const destination = destinationFor(window.location.pathname)
  if (game.restoring && destination !== 'settings') { navigate('settings', true); return }
  if (updating.value && destination !== 'updates') { navigate('updates', true); return }
  menuOpen.value = destination === 'menu'
  if (!menuOpen.value) menuDestination = null
  if (destination === 'home' || destination === 'game') {
    screen.value = destination; dialog.value = null
  } else {
    const origin = window.history.state?.codeOrigin
    if (origin === 'home' || origin === 'game') screen.value = origin
    dialog.value = isSecondary(destination) ? destination as 'library' | 'help' | 'settings' | 'updates' : null
    if (dialog.value && !pageReturnFocus.value) {
      pageReturnFocus.value = screen.value === 'game' ? menuButton.value : document.querySelector<HTMLElement>(destination === 'help' ? '.home-help' : '.home-settings') ?? undefined
    }
  }
}
function closePage() {
  if (updating.value || game.restoring) return
  if (window.history.state?.codeOverlay) window.history.back()
  else navigate(screen.value, true)
}
function startGame() {
  if (!game.ready) return
  if (game.resumeId && game.resumeId !== game.currentId) game.switchPuzzle(game.resumeId)
  else if (!game.resumeId && game.complete) game.switchPuzzle(nextPuzzleId(puzzles.value, game.sessions, game.currentId))
  if (dialog.value && screen.value === 'game') closePage()
  else navigate('game', !!dialog.value)
}
function refreshVisibleProgress() { if (document.visibilityState === 'visible') game.refreshProgress() }
function viewportChanged() { isPhone.value = phoneQuery.matches }
function enterLetter(letter: string) {
  if (!game.apply(letter) || game.complete) return
  const entered = game.message
  cipher.value?.advance()
  game.message = `${entered} ${game.message}`
}
const index = computed(() => puzzles.value.findIndex(p => p.quote.id === game.currentId))
const number = computed(() => String(index.value + 1).padStart(3, '0'))
const { needRefresh, busy: updating, phase: updatePhase, failure: updateFailure, checking: checkingUpdate, result: updateResult, check: checkForUpdates, apply: applyUpdate } = useAppUpdate()
const appearance = connectAppearance(() => game.theme, window.matchMedia('(prefers-color-scheme: dark)'))
watch(() => game.theme, appearance.apply)
watch(() => game.language, language => {
  document.documentElement.lang = language
  document.title = t('appTitle')
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'))
}, { immediate: true })
function keyboard(event: KeyboardEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null
  if (screen.value !== 'game' || dialog.value || menuOpen.value || game.restoring || !game.ready || target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return
  const action = keyboardAction(event, game.language)
  if (!action) return
  if (action.type === 'next' && !target?.closest('.cipher-cell')) return
  if (action.type === 'history') { event.preventDefault(); game.history(action.direction); return }
  if (game.complete) return
  event.preventDefault()
  if (action.type === 'layout-help') { game.feedback = t('layoutHelp'); game.message = game.feedback }
  else if (action.type === 'navigate') cipher.value?.navigate(action.key)
  else if (action.type === 'letter') enterLetter(action.letter)
  else if (action.type === 'next') cipher.value?.advance()
  else cipher.value?.erase()
}
function choose(id: string) { game.switchPuzzle(id); if (screen.value === 'game') closePage(); else navigate('game', true) }
function nextPuzzle() { game.switchPuzzle(nextPuzzleId(puzzles.value, game.sessions, game.currentId)) }
function hideLeavingBoard(element: Element) { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true') }
watch(() => [game.currentId, game.complete, game.ready] as const, async ([id, complete, ready], [previousId, wasComplete, wasReady]) => {
  animateCompletion.value = ready && wasReady && id === previousId && complete && !wasComplete
  await nextTick()
  if (id !== previousId || !wasReady || complete === wasComplete || screen.value !== 'game' || dialog.value || menuOpen.value) return
  if (complete) { game.message = t('completedQuote', { quote: game.puzzle.quote.text, author: game.puzzle.quote.author }); completionButton.value?.focus({ preventScroll: true }) }
  else cipher.value?.focusActive()
})

let layoutObserver: ResizeObserver | undefined
let layoutFrame = 0
function centerDesktop() {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = requestAnimationFrame(() => {
    if (screen.value !== 'game' || isPhone.value || isPage.value) return
    const workspace = document.querySelector<HTMLElement>('.workspace')
    const column = document.querySelector<HTMLElement>('.game-column')
    if (!workspace || !column) return
    const height = column.getBoundingClientRect().height
    const feedbackElement = document.querySelector<HTMLElement>('.feedback-message')
    const feedbackStyle = feedbackElement ? getComputedStyle(feedbackElement) : null
    const feedback = (feedbackElement?.getBoundingClientRect().height ?? 0) + parseFloat(feedbackStyle?.marginTop ?? '0') + parseFloat(feedbackStyle?.marginBottom ?? '0')
    // Balance the whole playing surface, including the keyboard, slightly above geometric center.
    const desired = window.innerHeight / 2 - height / 2 - Math.min(24, window.innerHeight * .02)
    const main = document.querySelector('.main-content')
    const bottomRoom = (main ? parseFloat(getComputedStyle(main).paddingBottom) : 16) + 8
    const available = window.innerHeight - height - feedback - bottomRoom
    workspace.style.setProperty('--desktop-offset', `${Math.max(56, Math.min(desired, available))}px`)
  })
}
async function observeGameLayout() {
  await nextTick()
  layoutObserver?.disconnect()
  for (const selector of ['.quote-region', '.input-deck', '.puzzle-toolbar', '.feedback-message']) {
    const element = document.querySelector(selector)
    if (element) layoutObserver?.observe(element)
  }
  centerDesktop()
}
watch([screen, () => game.ready, isPage], observeGameLayout)
watch([() => game.ready, dialog, screen], async ([ready, page]) => {
  if (!ready || !page || pageReturnFocus.value?.isConnected) return
  await nextTick()
  // A direct destination/reload has no live opener; restore its logical control.
  pageReturnFocus.value = screen.value === 'game' ? menuButton.value : document.querySelector<HTMLElement>(page === 'help' ? '.home-help' : '.home-settings') ?? undefined
})
watch(screen, async () => {
  await nextTick()
  if (dialog.value || menuOpen.value) return
  if (screen.value === 'game') cipher.value?.focusActive()
  else document.querySelector<HTMLButtonElement>('.home-play')?.focus({ preventScroll: true })
})
onMounted(() => {
  layoutObserver = new ResizeObserver(centerDesktop)
  window.addEventListener('resize', centerDesktop)
  window.addEventListener('focus', refreshVisibleProgress)
  document.addEventListener('visibilitychange', refreshVisibleProgress)
  phoneQuery.addEventListener('change', viewportChanged)
  syncPage()
  window.addEventListener('popstate', syncPage)
  void game.initialize()
  window.addEventListener('keydown', keyboard, true)
})
onBeforeUnmount(() => {
  layoutObserver?.disconnect(); cancelAnimationFrame(layoutFrame); appearance.dispose()
  window.removeEventListener('resize', centerDesktop)
  window.removeEventListener('focus', refreshVisibleProgress)
  document.removeEventListener('visibilitychange', refreshVisibleProgress)
  phoneQuery.removeEventListener('change', viewportChanged)
  window.removeEventListener('popstate', syncPage)
  window.removeEventListener('keydown', keyboard, true)
})
</script>

<template>
  <div class="app-shell" :class="{ 'has-screen': isPage, 'is-loading': !game.ready }">
    <HomeScreen v-if="screen === 'home'" v-show="!isPage" :inert="!!dialog || menuOpen" :has-progress="!!game.resumeId" :ready="game.ready" @play="startGame" @help="openPage('help', $event)" @settings="openPage('settings', $event)" />
    <div v-if="game.storageError && screen === 'home' && !dialog" class="home-storage storage-warning" role="alert"><button v-if="game.storageConflict" class="conflict-settings" @click="openPage('settings')">{{ t('progressConflict') }} <span>{{ t('settings') }}</span></button><template v-else>{{ t('storageWarning') }}</template></div>
    <button v-if="screen === 'game' && game.ready" v-show="!isPage" ref="menuButton" class="icon-button menu-toggle" :aria-label="t('openMenu')" aria-haspopup="dialog" :aria-expanded="menuOpen" :aria-describedby="needRefresh ? 'update-available' : undefined" :disabled="updating || game.restoring" @click="navigate('menu')"><Menu :size="23" :stroke-width="1.5" /><span v-if="needRefresh" class="update-dot" aria-hidden="true"></span><span v-if="needRefresh" id="update-available" class="sr-only">{{ t('updateAvailable') }}</span></button>
    <p v-if="screen === 'game' && game.ready && !game.storageError && !isPage" class="puzzle-meta"><span class="level-number">Nº {{ number }}</span><span>{{ t('difficulty.' + game.puzzle.quote.difficulty) }}</span></p>
    <div v-if="screen === 'game' && game.ready" v-show="!isPage" class="app-body" :inert="updating || game.restoring || !!dialog || menuOpen">
      <main id="main" class="main-content">
        <h1 class="sr-only">{{ t('cryptogram', { number }) }}</h1>
        <div class="workspace">
          <section class="game-column" :aria-label="t('game')">
            <div class="puzzle-area">
              <div class="quote-region" :class="{ 'is-complete': game.complete }">
                <div class="board-presentation"><Transition name="quote-unveil" :css="animateCompletion" @before-leave="hideLeavingBoard"><blockquote v-if="game.complete" :key="'decoded-' + game.currentId" class="decoded-quote">{{ game.puzzle.quote.text }}</blockquote><CipherBoard v-else :key="'cipher-' + game.currentId" ref="cipher" /></Transition></div>
                <div class="attribution"><span class="attribution-line"></span><div><span class="author">{{ game.puzzle.quote.author }}</span><span class="work-title">{{ game.puzzle.quote.work }}, {{ game.puzzle.quote.year }}</span></div></div>
              </div>
              <div class="puzzle-toolbar" :class="{ 'completion-actions': game.complete }">
                <div class="history-tools">
                  <button class="icon-button" :aria-label="t('undo')" :title="t('undoTitle')" :disabled="!game.ready || !game.session.undo.length" @click="game.history('undo')"><Undo2 :size="20" :stroke-width="1.5" /></button>
                  <button class="icon-button" :aria-label="t('redo')" :title="t('redoTitle')" :disabled="!game.ready || !game.session.redo.length" @click="game.history('redo')"><Redo2 :size="20" :stroke-width="1.5" /></button>
                  <span class="toolbar-divider"></span><button class="icon-button" :aria-label="t('restartPuzzle')" :title="t('restart')" :disabled="!game.ready" @click="dialog = 'restart'"><RotateCcw :size="17" :stroke-width="1.5" /></button>
                </div>
                <div v-if="!game.complete" class="assistance-tools"><button class="tool-button" :disabled="!game.hintTarget || !game.ready" @click="dialog = 'hint'"><Lightbulb :size="18" :stroke-width="1.5" /><span>{{ t('hint') }}</span></button><button class="tool-button check-button" :disabled="game.complete || !game.ready" @click="game.check()"><ShieldCheck :size="18" :stroke-width="1.5" /><span>{{ t('check') }}</span></button></div>
              </div>
            </div>

            <div class="input-deck">
              <GameKeyboard v-if="!game.complete" @letter="enterLetter" @next="cipher?.advance()" @erase="cipher?.erase()" />
              <button v-else ref="completionButton" class="resume-button" @click="nextPuzzle">{{ t('nextPuzzle') }} <ArrowRight :size="17" /></button>
            </div>
          </section>
        </div>
        <div class="status-region sr-only" role="status" aria-live="polite" aria-atomic="true">{{ game.message }}</div>
        <p class="feedback-message">{{ game.feedback }}</p>
        <div v-if="game.storageError" class="storage-warning" :class="{ 'has-conflict': game.storageConflict }" role="alert"><button v-if="game.storageConflict" class="conflict-settings" @click="openPage('settings')">{{ t('progressConflict') }} <span>{{ t('settings') }}</span></button><template v-else>{{ t('storageWarning') }}</template></div>
      </main>
    </div>

    <AppDialog v-if="menuOpen" ref="menuDialog" :return-focus="menuButton" title="CODE." drawer @close="closeMenu">
      <nav class="drawer-menu" :aria-label="t('navigation')">
        <button class="drawer-item" @click="openMenuPage('home')"><House :size="20" /><span>{{ t('mainMenu') }}</span><ArrowRight :size="17" /></button>
        <button class="drawer-item current-puzzle" @click="openMenuPage(null)"><span><strong>{{ t('currentPuzzle') }}</strong><small>Nº {{ number }} · {{ t('difficulty.' + game.puzzle.quote.difficulty) }}</small><small>{{ game.puzzle.quote.author }}<br />{{ game.puzzle.quote.work }}, {{ game.puzzle.quote.year }}</small></span><ArrowRight :size="19" /></button>
        <button class="drawer-item" @click="openMenuPage('library')"><Grid2X2 :size="20" /><span>{{ t('collection') }}</span><span class="menu-count">{{ puzzles.length }}</span></button>
        <button class="drawer-item" @click="openMenuPage('help')"><CircleHelp :size="20" /><span>{{ t('help') }}</span><ArrowUpRight :size="17" /></button>
        <button class="drawer-item" @click="openMenuPage('settings')"><Settings2 :size="20" /><span>{{ t('settings') }}</span><ArrowUpRight :size="17" /></button>
        <button class="drawer-item" @click="openMenuPage('updates')"><ScrollText :size="20" /><span><strong>{{ t('updates') }}</strong><small v-if="needRefresh" class="drawer-update-status"><span class="drawer-update-dot" aria-hidden="true"></span>{{ t('updateAvailable') }}</small></span><span class="menu-count">v{{ releases[0]!.version }}</span></button>
      </nav>
      <div class="drawer-footer">
        <div class="language-setting"><label for="game-language">{{ t('language') }}</label><select id="game-language" :value="game.language" :disabled="!game.ready" @change="game.setLanguage(($event.target as HTMLSelectElement).value as Locale)"><option value="en" lang="en">English</option><option value="ru" lang="ru">Русский</option></select></div>
      </div>
    </AppDialog>

    <AppDialog v-if="dialog === 'updates'" :key="String(isPhone)" :page="isPhone" :return-focus="pageReturnFocus" :title="t('updates')" class="release-dialog" :busy="updating" @close="closePage">
      <ReleaseNotes :available="needRefresh" :busy="updating" :checking="checkingUpdate" :phase="updatePhase" :failure="updateFailure" :result="updateResult" @check="checkForUpdates()" @apply="applyUpdate()" />
    </AppDialog>

    <AppDialog v-if="dialog === 'library'" :key="String(isPhone)" :page="isPhone" :return-focus="pageReturnFocus" :title="t('choosePuzzle')" @close="closePage">
      <PuzzleLibrary @choose="choose" />
    </AppDialog>

    <AppDialog v-if="dialog === 'help'" :key="String(isPhone)" :page="isPhone" :return-focus="pageReturnFocus" :title="t('help')" @close="closePage">
      <TutorialGame :language="game.language" :has-progress="!!game.resumeId" @play="startGame" @close="closePage" />
      <details class="help-reference"><summary>{{ t('moreHelp') }}</summary>
      <p class="difficulty-guide">{{ t('difficultyHelp') }}</p><ol class="help-steps"><li><strong>{{ t('findPattern') }}</strong><p>{{ t('patternHelp') }}</p></li><li><strong>{{ t('enterGuess') }}</strong><p>{{ t('guessHelp') }}</p></li><li><strong>{{ t('checkWhen') }}</strong><p>{{ t('checkHelp') }}</p></li></ol>
      <dl class="keyboard-shortcuts"><dt>{{ t('letterRange') }}</dt><dd>{{ t('typingHelp') }}</dd><dt>← →</dt><dd>{{ t('previousNext') }}</dd><dt>↑ ↓</dt><dd>{{ t('betweenRows') }}</dd><dt>Home / End</dt><dd>{{ t('firstLast') }}</dd><dt>Enter</dt><dd>{{ t('nextBlank') }}</dd><dt>Backspace / Delete</dt><dd>{{ t('erase') }}</dd><dt>Ctrl/⌘ Z · Shift Z</dt><dd>{{ t('undoRedo') }}</dd><dt>Tab</dt><dd>{{ t('tabHelp') }}</dd></dl>
      </details>
    </AppDialog>

    <AppDialog v-if="dialog === 'settings'" :key="String(isPhone)" :page="isPhone" :return-focus="pageReturnFocus" :title="t('settings')" :busy="game.restoring" @close="closePage">
      <AppearanceControl :model-value="game.theme" :disabled="!game.ready || game.restoring" @update:model-value="game.setTheme" />
      <div class="setting-row"><label for="settings-language">{{ t('language') }}</label><select id="settings-language" :value="game.language" :disabled="!game.ready || game.restoring" @change="game.setLanguage(($event.target as HTMLSelectElement).value as Locale)"><option value="en" lang="en">English</option><option value="ru" lang="ru">Русский</option></select></div>
      <div class="setting-row"><label for="haptics">{{ t('haptics') }}<small>{{ t('supported') }}</small></label><input id="haptics" :disabled="game.restoring" class="toggle-input" type="checkbox" :checked="game.haptics" @change="game.setHaptics(($event.target as HTMLInputElement).checked)" /></div>
      <p class="dialog-footnote">{{ t('privacy') }}</p>
      <ProgressBackup />
    </AppDialog>

    <AppDialog v-if="dialog === 'hint'" :title="t('revealTitle')" @close="dialog = null">
      <p class="dialog-description">{{ t('revealDescription', { number: game.hintTarget! }) }}</p>
      <div class="dialog-buttons"><button class="secondary-button" @click="dialog = null">{{ t('cancel') }}</button><button class="primary-button" @click="game.revealHint(); dialog = null">{{ t('reveal') }} <Lightbulb :size="17" /></button></div>
    </AppDialog>

    <AppDialog v-if="dialog === 'restart'" :title="t('restartTitle')" @close="dialog = null">
      <p class="dialog-description">{{ t('restartDescription') }}</p>
      <div class="dialog-buttons"><button class="secondary-button" @click="dialog = null">{{ t('cancel') }}</button><button class="primary-button" @click="game.restart(); dialog = null">{{ t('restart') }} <RotateCcw :size="17" /></button></div>
    </AppDialog>
  </div>
</template>
