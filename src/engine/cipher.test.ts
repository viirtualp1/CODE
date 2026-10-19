import { describe, expect, it } from 'vitest'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession, isComplete, isLocked, mistakes, nextEmptyCell, nextUnanswered, travel, validSession } from './cipher'
import type { Session } from './cipher'

const puzzle = createPuzzle(quotes[0]!)
const editable = puzzle.symbols.filter(n => !puzzle.clues[n])
const freeLetter = (session: Session) => [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(letter => !Object.values(session.entries).includes(letter))!

describe('curated corpus and substitution invariants', () => {
  it('keeps saved sessions and collection entries distinct', () => {
    expect(new Set(quotes.map(q => q.id)).size).toBe(quotes.length)
    expect(new Set(quotes.map(q => q.text.toUpperCase())).size).toBe(quotes.length)
    expect(quotes.every(q => /^[a-z]+(?:-[a-z]+)+$/.test(q.id) && Number.isInteger(q.revision) && q.revision > 0)).toBe(true)
  })
  it.each(quotes)('$id has deterministic unique mappings, valid clues and intact punctuation', quote => {
    const p = createPuzzle(quote)
    expect(createPuzzle(quote)).toEqual(p)
    expect(new Set(Object.values(p.solution)).size).toBe(p.symbols.length)
    expect(new Set(p.symbols).size).toBe(p.symbols.length)
    expect(p.symbols.every(n => Number.isInteger(n) && n >= 1 && n <= 26)).toBe(true)
    expect(p.words.map(word => word.map(cell => cell.symbol ? p.solution[cell.symbol] : cell.punctuation).join('')).join(' ')).toBe(quote.text.toUpperCase())
    expect(validSession(p, initialSession(p))).toBe(true)
    expect(p.words.every(word => word.filter(c => c.symbol).length <= 10)).toBe(true)
    expect(quote.source).toMatch(/^https:\/\/www.gutenberg.org/)
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
