import { describe, expect, it } from 'vitest'
import { publishedQuotes, quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession, isComplete, validSession } from './cipher'
import { decodeSession } from '../services/storage'

describe('compatible reviewed-clue upgrade', () => {
  it.each(quotes.filter(q => q.previousClues))('$id preserves compatible current state and every history snapshot', quote => {
    const old = createPuzzle(publishedQuotes.find(q => q.id === quote.id)!), puzzle = createPuzzle(quote)
    const editable = old.symbols.filter(n => !old.clues[n])
    let saved = initialSession(old)
    for (const symbol of editable) saved = edit(old, saved, symbol, old.solution[symbol]!).session
    const migrated = decodeSession(puzzle, { version: 1, revision: 1, session: saved })!
    expect(migrated).not.toBeNull()
    expect(isComplete(puzzle, migrated)).toBe(true)
    expect(validSession(puzzle, migrated)).toBe(true)
    expect(puzzle.solution).toEqual(old.solution)
    for (const symbol of puzzle.symbols.filter(n => !puzzle.clues[n])) expect(migrated.entries[symbol]).toBe(saved.entries[symbol])
  })
  it('removes only guesses conflicting with new givens, including conflicts in undo history', () => {
    const quote = quotes.find(q => q.previousClues)!, puzzle = createPuzzle(quote)
    const old = createPuzzle(publishedQuotes.find(q => q.id === quote.id)!)
    const newSymbol = puzzle.symbols.find(n => puzzle.clues[n] && !old.clues[n])!
    const remaining = puzzle.symbols.find(n => !puzzle.clues[n])!
    let saved = edit(old, initialSession(old), remaining, puzzle.solution[newSymbol]!).session
    const second = old.symbols.find(n => !puzzle.clues[n] && n !== remaining)!
    saved = edit(old, saved, second, puzzle.solution[second]!).session
    const result = decodeSession(puzzle, { version: 1, revision: 1, session: saved })!
    expect(result.entries[remaining]).toBeUndefined()
    expect(result.entries[newSymbol]).toBe(puzzle.solution[newSymbol])
    expect(result.entries[second]).toBe(puzzle.solution[second])
    expect(validSession(puzzle, result)).toBe(true)
    expect(decodeSession(puzzle, { version: 1, revision: 3, session: saved })).toBeNull()
    expect(decodeSession(puzzle, { version: 1, revision: 1, session: { ...saved, hints: [999] } })).toBeNull()
  })
})

it('preserves wrong unmarked guesses and hint locks that do not conflict with new clues', () => {
  const quote = quotes.find(q => q.previousClues)!, puzzle = createPuzzle(quote), old = createPuzzle(publishedQuotes.find(q => q.id === quote.id)!)
  const [first, second] = puzzle.symbols.filter(n => !puzzle.clues[n])
  const wrong = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(letter => !Object.values(puzzle.clues).includes(letter) && letter !== puzzle.solution[first!])!
  let session = edit(old, initialSession(old), first!, wrong).session
  session = edit(old, session, second!, puzzle.solution[second!]!, true).session
  const restored = decodeSession(puzzle, { version: 1, revision: 1, session })!
  expect(restored.entries[first!]).toBe(wrong)
  expect(restored.hints).toContain(second)
  expect(restored.undo.some(state => state.entries[first!] === wrong)).toBe(true)
})
