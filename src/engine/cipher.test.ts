import { describe, expect, it } from 'vitest'
import legacyEnglish from './fixtures/english-v024.json'
import { alphabetFor } from './alphabet'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession, isComplete, isLocked, mistakes, nextCheckedCell, nextEmptyCell, nextUnanswered, travel, validSession } from './cipher'
import type { Session } from './cipher'

const puzzle = createPuzzle(quotes[0]!)
const editable = puzzle.symbols.filter(n => !puzzle.clues[n])
const freeLetter = (session: Session) => [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(letter => !Object.values(session.entries).includes(letter))!

describe('curated corpus and substitution invariants', () => {
  it('keeps saved sessions and collection entries distinct', () => {
    expect(quotes.filter(q => (q.locale ?? 'en') === 'en')).toHaveLength(100)
    expect(quotes.filter(q => q.locale === 'ru')).toHaveLength(100)
    expect(new Set(quotes.map(q => q.id)).size).toBe(quotes.length)
    expect(new Set(quotes.map(q => q.text.toUpperCase())).size).toBe(quotes.length)
    expect(quotes.every(q => /^[a-z]+(?:-[a-z]+)+$/.test(q.id) && Number.isInteger(q.revision) && q.revision > 0)).toBe(true)
  })
  it.each(quotes)('$id has deterministic unique mappings, valid clues and intact punctuation', quote => {
    const p = createPuzzle(quote)
    expect(createPuzzle(quote)).toEqual(p)
    expect(new Set(Object.values(p.solution)).size).toBe(p.symbols.length)
    expect(new Set(p.symbols).size).toBe(p.symbols.length)
    expect(p.symbols.every(n => Number.isInteger(n) && n >= 1 && n <= alphabetFor(quote.locale).length)).toBe(true)
    expect(p.words.map(word => word.map(cell => cell.symbol ? p.solution[cell.symbol] : cell.punctuation).join('')).join(' ')).toBe(quote.text.toUpperCase())
    expect(validSession(p, initialSession(p))).toBe(true)
    expect(p.words.every(word => word.filter(c => c.symbol).length <= 12)).toBe(true)
    expect(quote.source).toMatch(quote.locale === 'ru' ? /^https:\/\/ru.wikisource.org/ : /^https:\/\/www.gutenberg.org/)
    expect(quote.clueRationale.length).toBeGreaterThan(30)
    expect(new Set(quote.clues).size).toBe(quote.clues.length)
    let solved = initialSession(p)
    for (const symbol of p.symbols.filter(n => !p.clues[n])) {
      const result = edit(p, solved, symbol, p.solution[symbol]!)
      expect(result.changed).toBe(true)
      solved = result.session
    }
    expect(isComplete(p, solved)).toBe(true)
    expect(validSession(p, solved)).toBe(true)
  })
})
describe('session operations', () => {
  it('updates all repeated occurrences through one mapping and allows wrong guesses', () => {
    const initial = initialSession(puzzle), symbol = editable[0]!
    const wrong = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(l => l !== puzzle.solution[symbol] && !Object.values(initial.entries).includes(l))!
    const result = edit(puzzle, initial, symbol, wrong)
    expect(result.changed).toBe(true)
    expect(puzzle.words.flat().filter(cell => cell.symbol === symbol).every(cell => result.session.entries[cell.symbol!] === wrong)).toBe(true)
    expect(mistakes(puzzle, result.session)).toEqual([symbol])
    expect(initial.entries[symbol]).toBeUndefined()
  })
  it('rejects duplicate assignment, invalid keys, missing selection, and edits to clues', () => {
    const initial = initialSession(puzzle)
    const letter = freeLetter(initial)
    const first = edit(puzzle, initial, editable[0]!, letter).session
    expect(edit(puzzle, first, editable[1]!, letter).changed).toBe(false)
    expect(edit(puzzle, first, editable[1]!, 'ab').changed).toBe(false)
    expect(edit(puzzle, first, null, 'X').changed).toBe(false)
    expect(edit(puzzle, first, Number(Object.keys(puzzle.clues)[0]), 'X').changed).toBe(false)
  })
  it('undoes/ redoes whole assignments and invalidates redo after a branch', () => {
    const initial = initialSession(puzzle)
    const first = edit(puzzle, initial, editable[0]!, freeLetter(initial)).session
    const back = travel(first, 'undo')
    expect(back.entries).toEqual(initial.entries)
    expect(travel(back, 'redo').entries).toEqual(first.entries)
    expect(edit(puzzle, back, editable[1]!, freeLetter(initial)).session.redo).toEqual([])
  })
  it('a hint displaces conflicting guesses atomically and can be undone', () => {
    const initial = initialSession(puzzle), symbol = editable[0]!, other = editable[1]!
    const first = edit(puzzle, initial, other, puzzle.solution[symbol]!).session
    const revealed = edit(puzzle, first, symbol, puzzle.solution[symbol]!, true).session
    expect(revealed.entries[other]).toBeUndefined()
    expect(isLocked(puzzle, revealed, symbol)).toBe(true)
    expect(travel(revealed, 'undo').entries).toEqual(first.entries)
    expect(travel(revealed, 'undo').hints).toEqual([])
    expect(edit(puzzle, first, symbol, 'Z', true).changed).toBe(false)
  })
  it('completion requires the exact full solution, not merely filled symbols', () => {
    let session = initialSession(puzzle)
    for (const symbol of editable) session = edit(puzzle, session, symbol, puzzle.solution[symbol]!).session
    expect(isComplete(puzzle, session)).toBe(true)
    expect(mistakes(puzzle, session)).toEqual([])
    expect(nextUnanswered(puzzle, session, null)).toBe(null)
    expect(isComplete(puzzle, travel(session, 'undo'))).toBe(false)
  })
  it('wraps unanswered selection and caps history', () => {
    const initial = initialSession(puzzle)
    expect(nextUnanswered(puzzle, initial, editable.at(-1)!)).toBe(editable[0])
    let session = initial
    for (let i = 0; i < 120; i++) session = edit(puzzle, session, editable[0]!, i % 2 ? '' : freeLetter(initial)).session
    expect(session.undo).toHaveLength(100)
    expect(validSession(puzzle, session)).toBe(true)
  })
})

describe('next empty occurrence', () => {
  const p = createPuzzle({ ...quotes[0]!, text: 'AB AC, DA BA.', clues: ['D'] })
  const cells = p.words.flat()
  const find = (letter: string) => Number(Object.keys(p.solution).find(n => p.solution[Number(n)] === letter))
  it('starts after the clicked repeated occurrence, skipping punctuation, clues and all filled matches', () => {
    const session = edit(p, initialSession(p), find('A'), 'X').session
    const lateA = cells.filter(c => c.symbol === find('A')).at(-2)!
    const target = nextEmptyCell(p, session, lateA.index)!
    expect(target.index).toBe([...cells].reverse().find(c => c.symbol === find('B'))!.index)
    expect(nextEmptyCell(p, session, cells[1]!.index)?.symbol).toBe(find('C'))
  })
  it('wraps once and starts at the first blank when no occurrence is selected', () => {
    const session = initialSession(p)
    expect(nextEmptyCell(p, session, cells.at(-1)!.index)).toEqual(cells[0])
    expect(nextEmptyCell(p, session, null)).toEqual(cells[0])
  })
  it('uses emptiness, never correctness, and retains focus when every symbol has an assignment', () => {
    let session = initialSession(p)
    for (const [letter, guess] of [['A', 'X'], ['B', 'Y'], ['C', 'Z']]) session = edit(p, session, find(letter!), guess!).session
    expect(isComplete(p, session)).toBe(false)
    expect(nextEmptyCell(p, session, 0)).toBeNull()
    expect(nextEmptyCell(p, { entries: p.solution, hints: [] }, null)).toBeNull()
  })
})

describe('Russian alphabet isolation', () => {
  const russian = createPuzzle({ ...quotes[0]!, id: 'ru-alphabet-test', locale: 'ru', text: 'Ещё ёж ест. Ёж ждёт.', clues: ['Ж'] })
  const symbolFor = (letter: string) => russian.symbols.find(n => russian.solution[n] === letter)!
  it('keeps Е and Ё distinct and supports numbers beyond 26', () => {
    expect(alphabetFor('ru')).toHaveLength(33)
    expect(symbolFor('Е')).not.toBe(symbolFor('Ё'))
    let session = initialSession(russian)
    session = edit(russian, session, symbolFor('Е'), 'Е').session
    expect(session.entries[symbolFor('Ё')]).toBeUndefined()
    const result = edit(russian, session, symbolFor('Ё'), 'Ё')
    expect(result.changed).toBe(true)
    expect(validSession(russian, result.session)).toBe(true)
    expect(edit(russian, session, symbolFor('Ё'), 'E').reason).toBe('useAlphabet')
    expect(validSession(russian, { ...session, entries: { ...session.entries, [symbolFor('Ё')]: 'E' } })).toBe(false)
    const full = createPuzzle({ ...quotes[0]!, locale: 'ru', text: alphabetFor('ru'), clues: ['А'] })
    expect(Math.max(...full.symbols)).toBe(33)
    expect(new Set(Object.values(full.solution)).size).toBe(33)
  })
  it('preserves neutral guesses, duplicate refusal and atomic hint undo in Russian', () => {
    const first = edit(russian, initialSession(russian), symbolFor('Е'), 'Ё').session
    expect(mistakes(russian, first)).toEqual([symbolFor('Е')])
    expect(edit(russian, first, symbolFor('Ё'), 'Ё').reason).toBe('duplicate')
    const hint = edit(russian, first, symbolFor('Ё'), 'Ё', true).session
    expect(hint.entries[symbolFor('Е')]).toBeUndefined()
    expect(travel(hint, 'undo').entries).toEqual(first.entries)
    expect(() => createPuzzle({ ...quotes[0]!, locale: 'ru', text: 'Mixed текст.' })).toThrow('Unsupported quote characters')
  })
})

// Golden permutations from the published 26-letter v0.2.4 seed algorithm.
it('keeps every published English mapping and saved numeric assignment compatible', () => {
  for (const [id, mapping] of Object.entries(legacyEnglish)) {
    const quote = quotes.find(q => q.id === id)!
    expect(quote.revision).toBe(quote.previousClues ? 3 : 1)
    const puzzle = createPuzzle(quote)
    const expected = Object.fromEntries(puzzle.symbols.map(n => [n, (mapping as Record<string, string>)[String(n)]]))
    expect(puzzle.solution).toEqual(expected)
  }
})

// The navigator receives explicit check marks, not guesses or an answer comparison.
describe('checked mistake navigation', () => {
  const p = createPuzzle({ ...quotes[0]!, text: 'AB AC, DA BA.', clues: ['D'] })
  const cells = p.words.flat()
  const a = cells[0]!.symbol!, b = cells[1]!.symbol!, c = cells[3]!.symbol!
  it('keeps a focused marked occurrence and never jumps back to its first match', () => {
    const lastA = cells.filter(cell => cell.symbol === a).at(-1)!
    expect(nextCheckedCell(p, [a, b], lastA.index)).toEqual(lastA)
  })
  it('moves forward from a correct, clue or blank occurrence and wraps once', () => {
    expect(nextCheckedCell(p, [b], cells[0]!.index)).toEqual(cells[1])
    expect(nextCheckedCell(p, [b], cells.at(-1)!.index)).toEqual(cells[1])
    expect(nextCheckedCell(p, [b], null)).toEqual(cells[1])
  })
  it('cannot infer mistakes without explicit check marks', () => {
    expect(nextCheckedCell(p, [], 0)).toBeNull()
    expect(nextCheckedCell(p, [999], 0)).toBeNull()
    expect(nextCheckedCell(p, [c], 0)?.symbol).toBe(c)
  })
})
