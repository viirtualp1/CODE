import type { Quote } from '../data/puzzles'

export type Assignments = Record<number, string>
export interface Snapshot { entries: Assignments; hints: number[] }
export interface Session extends Snapshot { undo: Snapshot[]; redo: Snapshot[] }
export interface Cell { symbol?: number; punctuation?: string; index: number }
export interface Puzzle { quote: Quote; solution: Assignments; clues: Assignments; words: Cell[][]; symbols: number[] }
export type EditResult = { session: Session; changed: boolean; reason?: string }
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function createPuzzle(quote: Quote): Puzzle {
  if (!/^[A-Za-z .,;:!?'’—-]+$/.test(quote.text)) throw new Error('Unsupported quote characters')
  // Stable seeded Fisher–Yates; clue choice is deliberately independent of this permutation.
  let seed = [...quote.id].reduce((n, char) => (Math.imul(n, 31) + char.charCodeAt(0)) >>> 0, 7919)
  const numbers = Array.from({ length: 26 }, (_, i) => i + 1)
  for (let i = 25; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[numbers[i], numbers[j]] = [numbers[j]!, numbers[i]!]
  }
  const mapping = Object.fromEntries([...alphabet].map((letter, i) => [letter, numbers[i]!])) as Record<string, number>
  const solution: Assignments = {}
  let index = 0
  const words = quote.text.toUpperCase().split(/\s+/).map(word => [...word].map(char => {
    const symbol = mapping[char]
    if (symbol) solution[symbol] = char
    return symbol ? { symbol, index: index++ } : { punctuation: char, index: index++ }
  }))
  const clues: Assignments = {}
  for (const letter of quote.clues) {
    const symbol = mapping[letter]
    if (!symbol || !solution[symbol]) throw new Error('Clue absent from quote')
    clues[symbol] = letter
  }
  const symbols = [...new Set(words.flat().flatMap(cell => cell.symbol ? [cell.symbol] : []))]
  if (Object.keys(clues).length >= symbols.length) throw new Error('Puzzle has no editable symbols')
  return { quote, solution, clues, words, symbols }
}
export function initialSession(puzzle: Puzzle): Session { return { entries: { ...puzzle.clues }, hints: [], undo: [], redo: [] } }
export function snapshot(session: Session): Snapshot { return clone({ entries: session.entries, hints: session.hints }) }
export function isLocked(puzzle: Puzzle, session: Snapshot, symbol: number) { return !!puzzle.clues[symbol] || session.hints.includes(symbol) }
export function edit(puzzle: Puzzle, session: Session, symbol: number | null, letter: string, hint = false): EditResult {
  if (!symbol || !puzzle.solution[symbol]) return { session, changed: false, reason: 'Select a number in the quote first.' }
  if (isLocked(puzzle, session, symbol)) return { session, changed: false, reason: 'This letter is a revealed clue.' }
  if (letter !== '' && !/^[A-Z]$/.test(letter)) return { session, changed: false, reason: 'Use a letter from A to Z.' }
  if (hint && letter !== puzzle.solution[symbol]) return { session, changed: false, reason: 'Invalid hint.' }
  const duplicate = Object.entries(session.entries).find(([key, value]) => Number(key) !== symbol && value === letter && letter)
  if (duplicate && !hint) return { session, changed: false, reason: `${letter} is already assigned to number ${duplicate[0]}. Erase it there first.` }
  const next = clone(session)
  if ((next.entries[symbol] || '') === letter && !hint) return { session, changed: false }
  // A confirmed hint may displace an existing guess; undo restores both atomically.
  if (duplicate) delete next.entries[Number(duplicate[0])]
  if (letter) next.entries[symbol] = letter
  else delete next.entries[symbol]
  if (hint) next.hints.push(symbol)
  next.undo = [...next.undo, snapshot(session)].slice(-100)
  next.redo = []
  return { session: next, changed: true }
}
export function travel(session: Session, direction: 'undo' | 'redo'): Session {
  const next = clone(session)
  const target = next[direction].pop()
  if (!target) return session
  next[direction === 'undo' ? 'redo' : 'undo'].push(snapshot(session))
  next.entries = target.entries
  next.hints = target.hints
  return next
}
export const mistakes = (puzzle: Puzzle, session: Snapshot): number[] => puzzle.symbols.filter(symbol => session.entries[symbol] && session.entries[symbol] !== puzzle.solution[symbol])
export const isComplete = (puzzle: Puzzle, session: Snapshot) => puzzle.symbols.every(symbol => session.entries[symbol] === puzzle.solution[symbol])
export const nextUnanswered = (puzzle: Puzzle, session: Snapshot, selected: number | null): number | null => {
  const start = selected === null ? -1 : puzzle.symbols.indexOf(selected)
  for (let i = 1; i <= puzzle.symbols.length; i++) {
    const symbol = puzzle.symbols[(start + i) % puzzle.symbols.length]!
    if (!session.entries[symbol]) return symbol
  }
  return null
}
/** Seek occurrences, rather than unique symbols: a repeated cell may be selected late in the quote. */
export function nextEmptyCell(puzzle: Puzzle, session: Snapshot, fromIndex: number | null): Cell | null {
  const cells = puzzle.words.flat()
  const start = fromIndex === null ? -1 : cells.findIndex(cell => cell.index === fromIndex)
  for (let offset = 1; offset <= cells.length; offset++) {
    const cell = cells[(start + offset) % cells.length]!
    if (cell.symbol && !session.entries[cell.symbol]) return cell
  }
  return null
}
export function validSnapshot(puzzle: Puzzle, value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as Snapshot
  if (!s.entries || typeof s.entries !== 'object' || Array.isArray(s.entries) || !Array.isArray(s.hints)) return false
  const values = Object.values(s.entries)
  return Object.keys(s.entries).every(key => String(Number(key)) === key && puzzle.symbols.includes(Number(key))) &&
    values.every(letter => typeof letter === 'string' && /^[A-Z]$/.test(letter)) && new Set(values).size === values.length &&
    Object.entries(puzzle.clues).every(([symbol, letter]) => s.entries[Number(symbol)] === letter) &&
    new Set(s.hints).size === s.hints.length && s.hints.every(symbol => typeof symbol === 'number' && puzzle.symbols.includes(symbol) && !puzzle.clues[symbol] && s.entries[symbol] === puzzle.solution[symbol])
}
export function validSession(puzzle: Puzzle, value: unknown): value is Session {
  if (!validSnapshot(puzzle, value)) return false
  const s = value as Session
  return Array.isArray(s.undo) && Array.isArray(s.redo) && s.undo.length <= 100 && s.redo.length <= 100 && [...s.undo, ...s.redo].every(state => validSnapshot(puzzle, state))
}
