import { describe, expect, it } from 'vitest'
import { indexWords } from './fairness'
import { reviewContent } from './content-review'
const words = (...values: string[]) => indexWords(values.map((word, index) => ({ word, frequency: 6 - index / 10 })))
describe('bounded editorial review', () => {
  it.each([
    { text: 'COLD', language: 'en' as const, clues: ['O', 'L'], dictionary: words('TOLD', 'GOLD', 'COLD', 'COLT') },
    { text: 'КОТ', language: 'ru' as const, clues: ['О'], dictionary: words('РОТ', 'ПОТ', 'КОТ') },
  ])('finds independent alternative readings in $language without preferring the stored answer', ({ text, language, clues, dictionary }) => {
    const result = reviewContent(text, language, clues, dictionary, { maxSolutions: 8 })
    expect(result.status).toBe('multiple')
    expect(result.flags).toContain('alternative-readings')
    expect(result.candidates.length).toBeGreaterThan(1)
    expect(result.candidates[0]!.text).not.toBe(text)
    expect(result.maxBranchDepth).toBeGreaterThan(0)
    expect(result.searchComplete).toBe(true)
    for (const candidate of result.candidates) {
      const forward = new Map<string, string>(), inverse = new Map<string, string>()
      for (let i = 0; i < text.length; i++) {
        const symbol = text[i]!, letter = candidate.text[i]!
        expect(forward.get(symbol) ?? letter).toBe(letter)
        expect(inverse.get(letter) ?? symbol).toBe(symbol)
        if (clues.includes(symbol)) expect(letter).toBe(symbol)
        forward.set(symbol, letter); inverse.set(letter, symbol)
      }
    }
  })
  it('reports a completed dictionary search separately from human-language uniqueness', () => {
    const result = reviewContent('LETTER', 'en', ['L'], words('LETTER', 'BETTER'))
    expect(result.status).toBe('single-in-lexicon')
    expect(result.candidates.map(candidate => candidate.text)).toEqual(['LETTER'])
    expect(result.candidates[0]!.branchDepth).toBe(0)
    expect(result.forcedAssignments).toBeGreaterThan(0)
  })
  it('exposes vocabulary gaps rather than injecting the target word', () => {
    const result = reviewContent('TOLD', 'en', ['O', 'L'], words('COLD'))
    expect(result.status).toBe('inconclusive')
    expect(result.missingWords).toEqual(['TOLD'])
    expect(result.candidates.map(candidate => candidate.text)).toEqual(['COLD'])
  })
  it('bounds candidate work, branching depth, node count and candidate count explicitly', () => {
    const dictionary = words('COLD', 'TOLD', 'GOLD', 'COLT')
    for (const [options, reason] of [[{ budget: 0 }, 'work'], [{ maxDepth: 0 }, 'depth'], [{ maxNodes: 0 }, 'nodes']] as const) {
      const result = reviewContent('COLD', 'en', ['O', 'L'], dictionary, options)
      expect(result.stopped).toBe(reason)
      expect(result.status).toBe('inconclusive')
      expect(result.searchComplete).toBe(false)
    }
    const capped = reviewContent('COLD', 'en', ['O', 'L'], dictionary, { maxSolutions: 2 })
    expect(capped.candidates).toHaveLength(2)
    expect(capped.stopped).toBe('solutions')
    expect(capped.status).toBe('multiple')
  })
  it('tracks deeper reasoning without treating frequency as grammatical correctness', () => {
    const result = reviewContent('AB CD EF GH', 'en', [], words('AB', 'CD', 'EF', 'GH', 'IJ', 'KL'))
    expect(result.maxBranchDepth).toBeGreaterThanOrEqual(4)
    expect(result.flags).toContain('deep-search')
  })
})
