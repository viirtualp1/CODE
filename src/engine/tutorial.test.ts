import { describe, expect, it } from 'vitest'
import { tutorialPuzzle } from './tutorial'
import { edit, initialSession, isComplete, mistakes, nextEmptyCell, travel } from './cipher'
describe('practice teaches the production rules in either language', () => {
  it.each(['en', 'ru'] as const)('%s has a given clue, grouped repeated blanks, neutral guesses and undo', locale => {
    const puzzle = tutorialPuzzle(locale)
    let session = initialSession(puzzle)
    const clue = Number(Object.keys(puzzle.clues)[0])
    expect(edit(puzzle, session, clue, '').changed).toBe(false)
    const first = nextEmptyCell(puzzle, session, null)!
    const duplicate = edit(puzzle, session, first.symbol!, puzzle.clues[clue]!)
    expect(duplicate.reason).toBe('duplicate')
    const wrong = locale === 'en' ? 'A' : 'А'
    session = edit(puzzle, session, first.symbol!, wrong).session
    expect(mistakes(puzzle, session)).toContain(first.symbol)
    session = travel(session, 'undo')
    expect(session.entries).toEqual(puzzle.clues)
    session = edit(puzzle, session, first.symbol!, puzzle.solution[first.symbol!]!).session
    const matches = puzzle.words.flat().filter(cell => cell.symbol === first.symbol)
    expect(matches.length).toBeGreaterThan(1)
    expect(matches.every(cell => session.entries[cell.symbol!] === puzzle.solution[cell.symbol!])).toBe(true)
    const remaining = nextEmptyCell(puzzle, session, first.index)!
    session = edit(puzzle, session, remaining.symbol!, puzzle.solution[remaining.symbol!]!).session
    expect(isComplete(puzzle, session)).toBe(true)
    expect(isComplete(puzzle, travel(session, 'undo'))).toBe(false)
  })
})
