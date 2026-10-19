import { describe, expect, it } from 'vitest'
import { quotes, publishedQuotes } from '../data/puzzles'
import { auditClues, indexWords, quoteWords, suggestClues, wordPattern } from './fairness'
describe('reviewed beginner content', () => {
  it('keeps 20 genuine beginner choices in each language and keeps answers/numbering stable', () => {
    for (const language of ['en', 'ru']) expect(quotes.filter(q => (q.locale ?? 'en') === language && q.difficulty === 'Easy')).toHaveLength(20)
    expect(quotes.map(q => [q.id, q.text])).toEqual(publishedQuotes.map(q => [q.id, q.text]))
  })
  it('keeps sparse authored clues, with no more than one extra Easy anchor', () => {
    for (const quote of quotes) {
      const original = publishedQuotes.find(q => q.id === quote.id)!
      expect(original.clues.every(letter => quote.clues.includes(letter))).toBe(true)
      expect(quote.clues.length - original.clues.length).toBeLessThanOrEqual(quote.difficulty === 'Easy' ? 1 : 0)
      expect(quoteWords(quote.text, quote.locale ?? 'en').join('').split('').filter(letter => /^[A-ZА-ЯЁ]$/.test(letter) && !quote.clues.includes(letter)).length).toBeGreaterThan(0)
    }
    expect(quotes.find(q => q.id === 'hamlet-possibility')!.clues).toEqual(['W', 'E', 'K'])
  })
  it('respects repeated letters, apostrophes and distinct Е/Ё', () => {
    expect(wordPattern('LETTER')).toBe('0.1.2.2.1.3')
    expect(quoteWords("I'm here, aren't I?", 'en')).toEqual(["I'M", 'HERE', "AREN'T", 'I'])
    expect(quoteWords('Ель, ёлка!', 'ru')).toEqual(['ЕЛЬ', 'ЁЛКА'])
  })
  it('retains ambiguity and refuses to certify a tiny ambiguous case instead of peeking at the answer', () => {
    const index = indexWords(['COLD', 'TOLD', 'GOLD', 'COLT'].map(word => ({ word, frequency: 5 })))
    expect(auditClues('COLD', 'en', ['O', 'L'], index).solved).toBe(false)
    expect(suggestClues('COLD', 'en', ['O', 'L'], index).audit.solved).toBe(false)
    expect(auditClues('COLD', 'en', ['O', 'L'], index, { budget: 0 }).exhausted).toBe(true)
  })
  it('never uses long or rare words as the beginner deduction step', () => {
    const index = indexWords([{ word: 'MYSTERY', frequency: 2 }, { word: 'EXTRAORDINARY', frequency: 6 }])
    const result = auditClues('MYSTERY EXTRAORDINARY', 'en', ['M', 'Y'], index)
    expect(result.anchors).toEqual([])
    expect(result.solved).toBe(false)
  })
})
