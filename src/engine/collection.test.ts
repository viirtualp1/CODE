import { describe, expect, it } from 'vitest'
import { quotes } from '../data/puzzles'
import { createPuzzle, edit, initialSession } from './cipher'
import { nextPuzzleId, progressStatus } from './collection'
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
  it('continues unfinished puzzles at the same difficulty before other levels, wrapping once', () => {
    const sessions = fresh(), first = puzzles[0]!, sameLevel = puzzles.find(p => p.quote.id !== first.quote.id && p.quote.difficulty === first.quote.difficulty)!
    expect(nextPuzzleId(puzzles, sessions, first.quote.id)).toBe(sameLevel.quote.id)
    for (const p of puzzles.filter(p => p.quote.difficulty === first.quote.difficulty)) sessions[p.quote.id]!.entries = { ...p.solution }
    const next = nextPuzzleId(puzzles, sessions, first.quote.id)
    expect(puzzles.find(p => p.quote.id === next)!.quote.difficulty).not.toBe(first.quote.difficulty)
    for (const p of puzzles) sessions[p.quote.id]!.entries = { ...p.solution }
    expect(nextPuzzleId(puzzles, sessions, first.quote.id)).toBe(puzzles[1]!.quote.id)
  })
})
