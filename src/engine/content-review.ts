import { alphabetFor } from './alphabet'
import type { PuzzleLanguage } from './alphabet'
import { quoteWords, wordPattern } from './fairness'
import type { WordIndex } from './fairness'

export interface ReviewOptions { budget?: number; maxNodes?: number; maxDepth?: number; maxSolutions?: number }
export interface ReviewCandidate { text: string; frequencyScore: number; branchDepth: number }
/** Developer-only dictionary search. No answer words are injected into candidate domains. */
export function reviewContent(text: string, language: PuzzleLanguage, clues: readonly string[], lexicon: WordIndex, options: ReviewOptions = {}) {
  const limits = { budget: Math.max(0, options.budget ?? 100_000), nodes: Math.max(0, options.maxNodes ?? 1000), depth: Math.max(0, options.maxDepth ?? 20), solutions: Math.max(2, Math.min(8, options.maxSolutions ?? 3)) }
  const words = [...new Set(quoteWords(text, language))]
  const letters = [...new Set(words.join('').replaceAll("'", ''))]
  if (!words.length || words.length > 64 || clues.some(letter => !letters.includes(letter))) throw new Error('Unsupported review input')
  const missingWords = words.filter(word => !lexicon.frequencies.has(word))
  const domains = words.map(word => [...(lexicon.patterns.get(wordPattern(word)) ?? [])].sort((a, b) => (lexicon.frequencies.get(b) ?? 0) - (lexicon.frequencies.get(a) ?? 0) || a.localeCompare(b, 'en')))
  const candidates: ReviewCandidate[] = []
  let work = 0, nodes = 0, depth = 0, deadEnds = 0, forcedAssignments = 0
  let stopped: 'work' | 'nodes' | 'depth' | 'solutions' | null = null
  function bind(word: string, candidate: string, mapping: Map<string, string>): Map<string, string> | null {
    const next = new Map(mapping), inverse = new Map([...mapping].map(([symbol, letter]) => [letter, symbol]))
    for (let i = 0; i < word.length; i++) {
      const symbol = word[i]!, letter = candidate[i]!
      if (symbol === "'") continue
      if ((next.has(symbol) && next.get(symbol) !== letter) || (inverse.has(letter) && inverse.get(letter) !== symbol)) return null
      next.set(symbol, letter); inverse.set(letter, symbol)
    }
    return next
  }
  function search(mapping: Map<string, string>, branchDepth: number, inherited = domains) {
    if (stopped) return
    if (nodes >= limits.nodes) { stopped = 'nodes'; return }
    nodes++; depth = Math.max(depth, branchDepth)
    let viable: string[][] = inherited
    for (;;) {
      const before = mapping.size
      const narrowed: string[][] = []
      for (let i = 0; i < words.length; i++) {
        const word = words[i]!, matches: string[] = []
        for (const candidate of viable[i]!) {
          if (work >= limits.budget) { stopped = 'work'; return }
          work++
          if (bind(word, candidate, mapping)) matches.push(candidate)
        }
        if (!matches.length) { deadEnds++; return }
        narrowed.push(matches)
        // Bind only letters shared by every remaining candidate, respecting the inverse map.
        for (let position = 0; position < word.length; position++) {
          const symbol = word[position]!, letter = matches[0]![position]!
          if (symbol === "'" || mapping.has(symbol) || !matches.every(candidate => candidate[position] === letter)) continue
          if ([...mapping].some(([other, value]) => other !== symbol && value === letter)) { deadEnds++; return }
          mapping.set(symbol, letter); forcedAssignments++
        }
      }
      // Shared-symbol domains can narrow one another even before a letter becomes forced.
      const allowed = new Map<string, Set<string>>()
      words.forEach((word, i) => {
        for (let position = 0; position < word.length; position++) {
          const symbol = word[position]!
          if (symbol === "'" || mapping.has(symbol)) continue
          const values = new Set(narrowed[i]!.map(candidate => candidate[position]!))
          allowed.set(symbol, new Set([...(allowed.get(symbol) ?? values)].filter(letter => values.has(letter))))
        }
      })
      for (const [symbol, values] of allowed) {
        if (!values.size) { deadEnds++; return }
        if (values.size === 1) {
          const letter = [...values][0]!
          if ([...mapping].some(([other, value]) => other !== symbol && value === letter)) { deadEnds++; return }
          mapping.set(symbol, letter); forcedAssignments++
        }
      }
      let reduced = false
      for (let i = 0; i < words.length; i++) {
        const word = words[i]!, compatible: string[] = []
        for (const candidate of narrowed[i]!) {
          if (work >= limits.budget) { stopped = 'work'; return }
          work++
          if ([...word].every((symbol, position) => !allowed.has(symbol) || allowed.get(symbol)!.has(candidate[position]!))) compatible.push(candidate)
        }
        if (!compatible.length) { deadEnds++; return }
        if (compatible.length < viable[i]!.length) reduced = true
        narrowed[i] = compatible
      }
      viable = narrowed
      if (mapping.size === before && !reduced) break
    }
    if (letters.every(letter => mapping.has(letter))) {
      const decoded = text.toUpperCase().replaceAll('’', "'").split('').map(letter => alphabetFor(language).includes(letter) ? mapping.get(letter)! : letter).join('')
      if (!candidates.some(candidate => candidate.text === decoded)) {
        const frequencyScore = words.reduce((score, word) => score + (lexicon.frequencies.get([...word].map(letter => letter === "'" ? letter : mapping.get(letter)!).join('')) ?? 0), 0) / words.length
        candidates.push({ text: decoded, frequencyScore, branchDepth })
      }
      return
    }
    const choice = viable.map((matches, index) => ({ matches, word: words[index]! })).filter(item => item.matches.length > 1).sort((a, b) => a.matches.length - b.matches.length || b.word.length - a.word.length)[0]
    if (!choice) { deadEnds++; return }
    if (branchDepth >= limits.depth) { stopped = 'depth'; return }
    for (const candidate of choice.matches) {
      if (candidates.length >= limits.solutions) { stopped = 'solutions'; return }
      const next = bind(choice.word, candidate, mapping)
      if (next) search(next, branchDepth + 1, viable)
      if (stopped) return
    }
  }
  search(new Map(clues.map(letter => [letter, letter])), 0)
  candidates.sort((a, b) => b.frequencyScore - a.frequencyScore || a.text.localeCompare(b.text, 'en'))
  const status = candidates.length > 1 ? 'multiple' : stopped || missingWords.length ? 'inconclusive' : candidates.length ? 'single-in-lexicon' : 'none-in-lexicon'
  const flags: string[] = []
  if (candidates.length > 1) flags.push('alternative-readings')
  if (missingWords.length) flags.push('dictionary-gaps')
  if (stopped) flags.push(`limit-${stopped}`)
  if (depth >= 4) flags.push('deep-search')
  if (!candidates.length && !stopped) flags.push('no-dictionary-solution')
  return { status, flags, candidates, missingWords, work, nodes, maxBranchDepth: depth, deadEnds, forcedAssignments, stopped, searchComplete: !stopped }
}
