import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession, isComplete, isLocked, mistakes, nextUnanswered, travel } from '../engine/cipher'
import type { Session } from '../engine/cipher'
import { decodeSession, readRecord, saveSession, writeRecord } from '../services/storage'
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
  const sessions = ref<Record<string, Session>>(Object.fromEntries(puzzles.map(p => [p.quote.id, initialSession(p)])))
  const ready = ref(false)
  const selected = ref<number | null>(null)
  const theme = ref<Theme>('system')
  const haptics = ref(false)
  const message = ref(t('selectPrompt'))
  const feedback = ref('')
  const checked = ref<number[]>([])
  const storageError = ref(false)
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
    try { await job } catch { storageError.value = true }
    finally { pendingSaves.value-- }
  }
  function save() { void persist(saveSession(puzzle.value, session.value)) }
  function savePreferences() { void persist(writeRecord('preferences', { version: 2, theme: theme.value, haptics: haptics.value, currentId: currentId.value, language: language.value, lastPuzzle: { ...lastPuzzle.value, [language.value]: currentId.value } })) }
  async function initialize() {
    try {
      const [preferences, ...records] = await Promise.all([readRecord('preferences'), ...puzzles.map(p => readRecord(`puzzle:${p.quote.id}`))])
      puzzles.forEach((p, i) => { sessions.value[p.quote.id] = decodeSession(p, records[i]) ?? initialSession(p) })
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
    message.value = t('selectPrompt')
    selected.value = startingSelection()
    ready.value = true
  }
  function tick() { if (haptics.value && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8) }
  function select(symbol: number, pulse = true) {
    selected.value = symbol
    feedback.value = ''
    message.value = isLocked(puzzle.value, session.value, symbol) ? t('selectedClue', { number: symbol, letter: session.value.entries[symbol]! }) : t('selectedMatches', { number: symbol, count: puzzle.value.words.flat().filter(c => c.symbol === symbol).length })
    if (pulse) tick()
  }
  function apply(letter: string, hint = false, symbol = selected.value) {
    if (!ready.value) return false
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
    if (!ready.value || !session.value[direction].length) return
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
    if (!collection.value.some(p => p.quote.id === id)) return
    currentId.value = id; selected.value = startingSelection(); checked.value = []
    feedback.value = ''; message.value = t('puzzleSelected'); savePreferences()
  }
  function restart() { feedback.value = ''; sessions.value[currentId.value] = initialSession(puzzle.value); selected.value = startingSelection(); checked.value = []; message.value = t('puzzleRestarted'); save() }
  function setLanguage(value: Locale) {
    if (!ready.value || !isLocale(value) || value === language.value) return
    lastPuzzle.value[language.value] = currentId.value
    language.value = value; i18n.global.locale.value = value
    currentId.value = collection.value.find(p => p.quote.id === lastPuzzle.value[value])?.quote.id ?? collection.value[0]!.quote.id
    selected.value = startingSelection(); checked.value = []; feedback.value = ''; message.value = t('puzzleSelected')
    savePreferences()
  }
  function setTheme(value: Theme) { theme.value = value; savePreferences() }
  function setHaptics(value: boolean) { haptics.value = value; tick(); savePreferences() }
  return { language, collection, setLanguage, ready, currentId, sessions, selected, theme, haptics, message, feedback, checked, storageError, pendingSaves, puzzle, session, complete, locked, hintTarget, initialize, select, apply, eraseChecked, revealHint, history, check, switchPuzzle, restart, setTheme, setHaptics }
})
