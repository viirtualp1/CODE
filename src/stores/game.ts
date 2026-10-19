import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession, isComplete, isLocked, mistakes, nextUnanswered, travel } from '../engine/cipher'
import type { Session } from '../engine/cipher'
import { decodeSession, readRecord, saveSession, writeRecord } from '../services/storage'
import type { Preferences, Theme } from '../services/storage'

export const puzzles = quotes.map(createPuzzle)
export const useGameStore = defineStore('game', () => {
  const currentId = ref(quotes[0]!.id)
  const sessions = ref<Record<string, Session>>(Object.fromEntries(puzzles.map(p => [p.quote.id, initialSession(p)])))
  const ready = ref(false)
  const selected = ref<number | null>(null)
  const theme = ref<Theme>('system')
  const haptics = ref(false)
  const message = ref('Select a number, then enter a letter.')
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
  function savePreferences() { void persist(writeRecord('preferences', { theme: theme.value, haptics: haptics.value, currentId: currentId.value })) }
  async function initialize() {
    try {
      const [preferences, ...records] = await Promise.all([readRecord('preferences'), ...puzzles.map(p => readRecord(`puzzle:${p.quote.id}`))])
      puzzles.forEach((p, i) => { sessions.value[p.quote.id] = decodeSession(p, records[i]) ?? initialSession(p) })
      if (preferences && typeof preferences === 'object') {
        const p = preferences as Partial<Preferences>
        if (p.theme && ['light', 'dark', 'system'].includes(p.theme)) theme.value = p.theme
        if (typeof p.haptics === 'boolean') haptics.value = p.haptics
        if (p.currentId && puzzles.some(puzzle => puzzle.quote.id === p.currentId)) currentId.value = p.currentId
      }
    } catch { storageError.value = true }
    selected.value = startingSelection()
    ready.value = true
  }
  function tick() { if (haptics.value && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8) }
  function select(symbol: number, pulse = true) {
    selected.value = symbol
    feedback.value = ''
    message.value = isLocked(puzzle.value, session.value, symbol) ? `Number ${symbol} is a revealed ${session.value.entries[symbol]}.` : `Number ${symbol} selected. ${puzzle.value.words.flat().filter(c => c.symbol === symbol).length} matching letters.`
    if (pulse) tick()
  }
  function apply(letter: string, hint = false, symbol = selected.value) {
    if (!ready.value) return false
    const result = edit(puzzle.value, session.value, symbol, letter, hint)
    if (!result.changed) { if (result.reason) { message.value = result.reason; feedback.value = result.reason }; return false }
    sessions.value[currentId.value] = result.session
    feedback.value = ''
    checked.value = []
    message.value = complete.value ? 'Puzzle decoded.' : hint ? `Number ${symbol} is ${letter}. Hint revealed; undo is available.` : letter ? `${letter} entered for every number ${symbol}.` : `Number ${symbol} erased.`
    tick(); save(); return true
  }
  function revealHint() { const symbol = hintTarget.value; if (symbol) { selected.value = symbol; apply(puzzle.value.solution[symbol]!, true, symbol) } }
  function history(direction: 'undo' | 'redo') {
    if (!ready.value || !session.value[direction].length) return
    sessions.value[currentId.value] = travel(session.value, direction)
    if (selected.value === null) selected.value = startingSelection()
    feedback.value = ''
    checked.value = []; message.value = direction === 'undo' ? 'Last move undone.' : 'Move restored.'
    tick(); save()
  }
  function check() {
    checked.value = mistakes(puzzle.value, session.value)
    const guesses = Object.keys(session.value.entries).length - Object.keys(puzzle.value.clues).length - session.value.hints.length
    message.value = checked.value.length ? `${checked.value.length} ${checked.value.length === 1 ? 'assignment needs' : 'assignments need'} another look. Marked with a dot.` : guesses ? 'Your entered letters look good. Keep going.' : 'No guesses to check yet. Try a letter first.'
    feedback.value = message.value
  }
  function switchPuzzle(id: string) {
    if (!puzzles.some(p => p.quote.id === id)) return
    currentId.value = id; selected.value = startingSelection(); checked.value = []
    feedback.value = ''; message.value = 'Puzzle selected.'; savePreferences()
  }
  function restart() { feedback.value = ''; sessions.value[currentId.value] = initialSession(puzzle.value); selected.value = startingSelection(); checked.value = []; message.value = 'Puzzle restarted.'; save() }
  function setTheme(value: Theme) { theme.value = value; savePreferences() }
  function setHaptics(value: boolean) { haptics.value = value; tick(); savePreferences() }
  return { ready, currentId, sessions, selected, theme, haptics, message, feedback, checked, storageError, pendingSaves, puzzle, session, complete, locked, hintTarget, initialize, select, apply, revealHint, history, check, switchPuzzle, restart, setTheme, setHaptics }
})
