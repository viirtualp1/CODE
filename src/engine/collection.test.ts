import { describe, expect, it } from 'vitest'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession } from './cipher'
import { nextPuzzleId, progressStatus, puzzleEffort } from './collection'
const puzzles = quotes.filter(q => !q.locale).map(createPuzzle)
const fresh = () => Object.fromEntries(puzzles.map(p => [p.quote.id, initialSession(p)]))
describe('collection navigation', () => {
  it('distinguishes fresh, edited, cleared-with-history, hinted and completed sessions', () => {
    const p = puzzles[0]!, initial = initialSession(p), symbol = p.symbols.find(n => !p.clues[n])!
    expect(progressStatus(p, initial)).toBe('new')
    const started = edit(p, initial, symbol, p.solution[symbol]!).session
    expect(progressStatus(p, started)).toBe('started')
    expect(progressStatus(p, edit(p, started, symbol, '').session)).toBe('started')
    expect(progressStatus(p, edit(p, initial, symbol, p.solution[symbol]!, true).session)).toBe('started')
    expect(progressStatus(p, { ...initial, entries: { ...p.solution } })).toBe('complete')
  })
  it('allows consecutive calm puzzles, then a peak and recovery, considering quote length', () => {
    const fixtures = [
      ['calm-a', 'Easy', 30], ['calm-b', 'Easy', 38], ['calm-c', 'Medium', 16],
      ['medium-a', 'Medium', 55], ['medium-b', 'Medium', 95], ['hard-a', 'Hard', 50], ['hard-b', 'Hard', 95],
    ].map(([id, difficulty, length], index) => createPuzzle({ ...quotes[0]!, id: String(id), author: `Author ${index}`, difficulty: difficulty as 'Easy' | 'Medium' | 'Hard', text: 'T'.repeat(Number(length)), clues: [] }))
    const sessions = Object.fromEntries(fixtures.map(p => [p.quote.id, initialSession(p)]))
    let current = fixtures[0]!
    const effort: number[] = []
    for (let step = 0; step < 4; step++) {
      sessions[current.quote.id]!.entries = { ...current.solution }
      const id = nextPuzzleId(fixtures, sessions, current.quote.id)
      expect(nextPuzzleId(fixtures, sessions, current.quote.id)).toBe(id)
      expect(sessions[id]!.entries).not.toEqual(fixtures.find(p => p.quote.id === id)!.solution)
      current = fixtures.find(p => p.quote.id === id)!
      effort.push(puzzleEffort(current))
    }
    expect(effort[0]).toBeLessThan(.4)
    expect(effort[1]).toBeLessThan(.45)
    expect(effort[2]).toBeGreaterThan(.65)
    expect(effort[3]).toBeLessThan(effort[2]!)
    expect(puzzleEffort(fixtures[3]!)).toBeLessThan(puzzleEffort(fixtures[4]!))
  })
  it('falls back to remaining difficulty and wraps when everything is complete', () => {
    const sessions = fresh(), first = puzzles[0]!, remaining = puzzles[1]!
    for (const p of puzzles) sessions[p.quote.id]!.entries = { ...p.solution }
    const wrapped = nextPuzzleId(puzzles, sessions, first.quote.id)
    expect(wrapped).not.toBe(first.quote.id)
    expect(puzzles.some(p => p.quote.id === wrapped)).toBe(true)
    sessions[remaining.quote.id] = initialSession(remaining)
    expect(nextPuzzleId(puzzles, sessions, first.quote.id)).toBe(remaining.quote.id)
    expect(nextPuzzleId([first], sessions, first.quote.id)).toBe(first.quote.id)
  })
})
