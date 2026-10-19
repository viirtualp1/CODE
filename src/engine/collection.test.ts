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
  it('mixes difficulty and author in a stable order, skipping finished puzzles', () => {
    const sessions = fresh(), first = puzzles[0]!
    const id = nextPuzzleId(puzzles, sessions, first.quote.id), next = puzzles.find(p => p.quote.id === id)!
    expect(next.quote.difficulty).not.toBe(first.quote.difficulty)
    expect(next.quote.author).not.toBe(first.quote.author)
    expect(nextPuzzleId(puzzles, sessions, first.quote.id)).toBe(id)
    sessions[id]!.entries = { ...next.solution }
    expect(nextPuzzleId(puzzles, sessions, first.quote.id)).not.toBe(id)
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
