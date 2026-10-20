import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'
import { quotes } from '../data/puzzles'
import { progressStatus } from '../engine/collection'
import { planRestore } from '../services/backup'
import type { ParsedBackup } from '../services/backup'
import { createPuzzle, edit, initialSession, isComplete, isLocked, mistakes, nextUnanswered, travel } from '../engine/cipher'
import type { Session } from '../engine/cipher'
import { acknowledgeProgressReload, decodeSession, observeProgressRecord, ProgressConflict, readRecord, saveSession, subscribeProgress, writeRecord, writeRecords } from '../services/storage'
import { deviceLocale, i18n, isLocale, t } from '../i18n'
import type { Locale } from '../i18n'
import type { Preferences, Theme } from '../services/storage'

export const puzzles = quotes.map(createPuzzle)
export const useGameStore = defineStore('game', () => {
  const language = ref<Locale>(deviceLocale())
  i18n.global.locale.value = language.value
  const collection = computed(() => puzzles.filter(p => (p.quote.locale ?? 'en') === language.value))
  const lastPuzzle = ref<Partial<Record<Locale, string>>>({})
  const currentId = ref(collection.value[0]!.quote.id)
  const resumePointers = computed(() => ({ ...lastPuzzle.value, [language.value]: currentId.value }))
  const sessions = ref<Record<string, Session>>(Object.fromEntries(puzzles.map(p => [p.quote.id, initialSession(p)])))
  const ready = ref(false)
  const restoring = ref(false)
  const selected = ref<number | null>(null)
  const theme = ref<Theme>('system')
  const haptics = ref(false)
  const message = ref(t('selectPrompt'))
  const feedback = ref('')
  const checked = ref<number[]>([])
  const storageError = ref(false)
  const storageConflict = ref(false)
  const syncing = ref(false)
  const changedKeys = new Set<string>()
  const pendingSaves = ref(0)
  const puzzle = computed(() => puzzles.find(p => p.quote.id === currentId.value)!)
  const session = computed(() => sessions.value[currentId.value]!)
  const complete = computed(() => isComplete(puzzle.value, session.value))
  const locked = computed(() => selected.value === null || isLocked(puzzle.value, session.value, selected.value))
  const hintTarget = computed(() => complete.value ? null : selected.value && !isLocked(puzzle.value, session.value, selected.value) ? selected.value : puzzle.value.symbols.find(n => !isLocked(puzzle.value, session.value, n) && !session.value.entries[n]) ?? puzzle.value.symbols.find(n => !isLocked(puzzle.value, session.value, n)) ?? null)

  function startingSelection() {
    return nextUnanswered(puzzle.value, session.value, null) ?? puzzle.value.symbols.find(n => !isLocked(puzzle.value, session.value, n)) ?? null
  }
  async function persist(job: Promise<unknown>) {
    pendingSaves.value++
    try { await job } catch (error) { storageError.value = true; if (error instanceof ProgressConflict) storageConflict.value = true }
    finally { pendingSaves.value--; if (!pendingSaves.value) void syncProgress() }
  }
  function save() { if (!storageConflict.value) void persist(saveSession(puzzle.value, session.value)) }
  function savePreferences() { void persist(writeRecord('preferences', { version: 2, theme: theme.value, haptics: haptics.value, currentId: currentId.value, language: language.value, lastPuzzle: { ...lastPuzzle.value, [language.value]: currentId.value } })) }
  async function initialize() {
    try {
      const [preferences, ...records] = await Promise.all([readRecord('preferences'), ...puzzles.map(p => readRecord(`puzzle:${p.quote.id}`, false))])
      const upgrades: Promise<void>[] = []
      puzzles.forEach((p, i) => {
        observeProgressRecord(`puzzle:${p.quote.id}`, records[i])
        const decoded = decodeSession(p, records[i])
        sessions.value[p.quote.id] = decoded ?? initialSession(p)
        if (decoded && (records[i] as { revision?: number })?.revision !== p.quote.revision) upgrades.push(persist(saveSession(p, decoded)))
      })
      await Promise.all(upgrades)
      if (preferences && typeof preferences === 'object') {
        const p = preferences as Partial<Preferences>
        if (p.theme && ['light', 'dark', 'system'].includes(p.theme)) theme.value = p.theme
        if (typeof p.haptics === 'boolean') haptics.value = p.haptics
        // Preferences v1 had only currentId; its valid puzzle establishes the legacy language.
        // Unknown versions are ignored; session envelopes/database remain at version 1.
        if (p.version === undefined || p.version === 2) {
          const legacyPuzzle = puzzles.find(item => item.quote.id === p.currentId)
          if (isLocale(p.language) && p.version === 2) language.value = p.language
          else if (legacyPuzzle) language.value = legacyPuzzle.quote.locale ?? 'en'
          for (const locale of ['en', 'ru'] as const) {
            const id = p.lastPuzzle?.[locale]
            if (puzzles.some(item => item.quote.id === id && (item.quote.locale ?? 'en') === locale)) lastPuzzle.value[locale] = id
          }
          currentId.value = collection.value.find(item => item.quote.id === p.currentId)?.quote.id ?? collection.value.find(item => item.quote.id === lastPuzzle.value[language.value])?.quote.id ?? collection.value[0]!.quote.id
        }
      }
    } catch { storageError.value = true }
    i18n.global.locale.value = language.value
    message.value = t(complete.value ? 'puzzleDecoded' : 'selectPrompt')
    selected.value = startingSelection()
    ready.value = true
    void syncProgress()
  }
  function tick() { if (haptics.value && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8) }
  function select(symbol: number, pulse = true) {
    selected.value = symbol
    feedback.value = ''
    message.value = isLocked(puzzle.value, session.value, symbol) ? t('selectedClue', { number: symbol, letter: session.value.entries[symbol]! }) : t('selectedMatches', { number: symbol, count: puzzle.value.words.flat().filter(c => c.symbol === symbol).length })
    if (pulse) tick()
  }
  function apply(letter: string, hint = false, symbol = selected.value) {
    if (!ready.value || restoring.value) return false
    const result = edit(puzzle.value, session.value, symbol, letter, hint)
    if (!result.changed) { if (result.reason) { message.value = t(result.reason, result.reasonParams ?? {}); feedback.value = message.value }; return false }
    sessions.value[currentId.value] = result.session
    feedback.value = ''
    checked.value = []
    message.value = complete.value ? t('puzzleDecoded') : hint ? t('hintRevealed', { number: symbol!, letter }) : letter ? t('entered', { letter, number: symbol! }) : t('erased', { number: symbol! })
    tick(); save(); return true
  }
  function eraseChecked(symbol: number) {
    if (!checked.value.includes(symbol)) return false
    const remaining = checked.value.filter(n => n !== symbol)
    const changed = apply('', false, symbol)
    if (changed) checked.value = remaining
    return changed
  }
  function revealHint() { const symbol = hintTarget.value; if (symbol) { selected.value = symbol; apply(puzzle.value.solution[symbol]!, true, symbol) } }
  function history(direction: 'undo' | 'redo') {
    if (!ready.value || restoring.value || !session.value[direction].length) return
    sessions.value[currentId.value] = travel(session.value, direction)
    if (selected.value === null) selected.value = startingSelection()
    feedback.value = ''
    checked.value = []; message.value = t(direction === 'undo' ? 'undone' : 'restored')
    tick(); save()
  }
  function check() {
    checked.value = mistakes(puzzle.value, session.value)
    const guesses = Object.keys(session.value.entries).length - Object.keys(puzzle.value.clues).length - session.value.hints.length
    message.value = checked.value.length ? t('checkMistakes', { count: checked.value.length }) : t(guesses ? 'checkGood' : 'checkEmpty')
    feedback.value = message.value
  }
  function switchPuzzle(id: string) {
    if (restoring.value || !collection.value.some(p => p.quote.id === id)) return
    currentId.value = id; selected.value = startingSelection(); checked.value = []
    feedback.value = ''; message.value = t('puzzleSelected'); savePreferences()
  }
  function restart() { if (restoring.value) return; feedback.value = ''; sessions.value[currentId.value] = initialSession(puzzle.value); selected.value = startingSelection(); checked.value = []; message.value = t('puzzleRestarted'); save() }
  function setLanguage(value: Locale) {
    if (!ready.value || restoring.value || !isLocale(value) || value === language.value) return
    lastPuzzle.value[language.value] = currentId.value
    language.value = value; i18n.global.locale.value = value
    currentId.value = collection.value.find(p => p.quote.id === lastPuzzle.value[value])?.quote.id ?? collection.value[0]!.quote.id
    selected.value = startingSelection(); checked.value = []; feedback.value = ''; message.value = t('puzzleSelected')
    savePreferences()
  }
  async function restoreProgress(backup: ParsedBackup, replaceExisting = false) {
    if (!ready.value || restoring.value || syncing.value || storageConflict.value) return false
    restoring.value = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('Restore timed out')), 30_000)
    try {
      const plan = planRestore(puzzles, sessions.value, backup, replaceExisting)
      const pointers = { ...lastPuzzle.value }
      for (const locale of ['en', 'ru'] as const) {
        const hasLocalProgress = puzzles.some(p => (p.quote.locale ?? 'en') === locale && progressStatus(p, sessions.value[p.quote.id]!) !== 'new')
        const id = backup.resume?.[locale]
        if (!hasLocalProgress && id && plan.sessions[id] && puzzles.some(p => p.quote.id === id && (p.quote.locale ?? 'en') === locale)) pointers[locale] = id
      }
      const restoredCurrent = pointers[language.value] && !collection.value.some(p => progressStatus(p, sessions.value[p.quote.id]!) !== 'new') ? pointers[language.value]! : currentId.value
      const records: { key: string; value: unknown }[] = puzzles.map(p => ({ key: `puzzle:${p.quote.id}`, value: { version: 1, revision: p.quote.revision, session: plan.sessions[p.quote.id]! } }))
      records.push({ key: 'preferences', value: { version: 2, theme: theme.value, haptics: haptics.value, currentId: restoredCurrent, language: language.value, lastPuzzle: { ...pointers, [language.value]: restoredCurrent } } })
      // Persist the complete merged state before changing anything the player sees.
      await writeRecords(records, controller.signal)
      sessions.value = plan.sessions; lastPuzzle.value = pointers; currentId.value = restoredCurrent
      selected.value = startingSelection(); checked.value = []; feedback.value = ''
      message.value = t('backup.restored'); storageError.value = false
      return true
    } catch (error) { if (error instanceof ProgressConflict) { storageConflict.value = true; storageError.value = true }; return false }
    finally { clearTimeout(timeout); restoring.value = false; void syncProgress() }
  }
  async function syncProgress(reload = false) {
    if (!ready.value || syncing.value || restoring.value || pendingSaves.value || (!reload && (storageError.value || !changedKeys.size))) return false
    syncing.value = true
    const keys = reload ? puzzles.map(p => `puzzle:${p.quote.id}`) : [...changedKeys]
    keys.forEach(key => changedKeys.delete(key))
    const before = new Map(keys.map(key => [key, JSON.stringify(sessions.value[key.slice(7)])]))
    try {
      const records = await Promise.all(keys.map(key => readRecord(key, false)))
      // Typing during a foreground refresh stays responsive; never adopt over a new local move.
      if ((!reload && storageError.value) || pendingSaves.value || keys.some(key => before.get(key) !== JSON.stringify(sessions.value[key.slice(7)]))) {
        keys.forEach(key => changedKeys.add(key)); return false
      }
      let currentChanged = false
      keys.forEach((key, index) => {
        const id = key.slice(7), p = puzzles.find(p => p.quote.id === id)
        if (p) {
          const session = decodeSession(p, records[index]) ?? initialSession(p)
          observeProgressRecord(key, records[index])
          if (JSON.stringify(session) !== JSON.stringify(sessions.value[id])) { sessions.value[id] = session; if (id === currentId.value) currentChanged = true }
        }
      })
      if (currentChanged || reload) { selected.value = startingSelection(); checked.value = []; feedback.value = '' }
      if (reload) { acknowledgeProgressReload(); storageConflict.value = false; storageError.value = false }
      if (currentChanged || reload) message.value = t('progressSynced')
      return true
    } catch { storageError.value = true; return false }
    finally { syncing.value = false; if (changedKeys.size && !storageError.value) void syncProgress() }
  }
  function refreshProgress() {
    if (!ready.value || storageError.value) return
    puzzles.forEach(p => changedKeys.add(`puzzle:${p.quote.id}`)); void syncProgress()
  }
  const unsubscribe = subscribeProgress(keys => {
    keys.forEach(key => changedKeys.add(key)); void syncProgress()
  })
  onScopeDispose(unsubscribe)
  function setTheme(value: Theme) { theme.value = value; savePreferences() }
  function setHaptics(value: boolean) { haptics.value = value; tick(); savePreferences() }
  return { storageConflict, syncing, syncProgress, refreshProgress, language, collection, resumePointers, setLanguage, ready, restoring, restoreProgress, currentId, sessions, selected, theme, haptics, message, feedback, checked, storageError, pendingSaves, puzzle, session, complete, locked, hintTarget, initialize, select, apply, eraseChecked, revealHint, history, check, switchPuzzle, restart, setTheme, setHaptics }
})
