import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { quotes, publishedQuotes } from '../data/puzzles'
import { auditClues, indexWords, quoteWords, suggestClues, wordPattern } from './fairness'
const lexicons = Object.fromEntries((['en', 'ru'] as const).map(language => [language, indexWords(readFileSync(new URL(`../../scripts/lexicons/${language}.tsv`, import.meta.url), 'utf8').trim().split('\n').map(line => { const [word, frequency] = line.split('\t'); return { word: word!, frequency: Number(frequency) } }))]))
describe('reviewed beginner content', () => {
  it('keeps 20 genuine beginner choices in each language and keeps answers/numbering stable', () => {
    for (const language of ['en', 'ru']) expect(quotes.filter(q => (q.locale ?? 'en') === language && q.difficulty === 'Easy')).toHaveLength(20)
    expect(quotes.map(q => [q.id, q.text])).toEqual(publishedQuotes.map(q => [q.id, q.text]))
  })
  it.each(quotes.filter(q => q.difficulty === 'Easy'))('$id can be deduced through common words without recognising its source', quote => {
    const language = quote.locale ?? 'en', lexicon = lexicons[language]!
    const result = auditClues(quote.text, language, quote.clues, lexicon)
    expect(result.solved).toBe(true)
    expect(result.exhausted).toBe(false)
    expect(result.letters - quote.clues.length).toBeGreaterThanOrEqual(2)
    expect(result.steps.length).toBeGreaterThan(0)
    for (const step of result.steps) {
      expect(step.letters.length).toBeLessThanOrEqual(2)
      expect(step.word.length).toBeLessThanOrEqual(language === 'ru' ? 8 : 7)
      expect(lexicon.frequencies.get(step.word)).toBeGreaterThanOrEqual(language === 'ru' ? 4 : 4.5)
    }
    expect(quote.previousClues?.every(letter => quote.clues.includes(letter))).toBe(true)
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
