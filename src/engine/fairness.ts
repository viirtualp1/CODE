import type { PuzzleLanguage } from './alphabet'

export interface LexiconEntry { word: string; frequency: number }
export interface WordIndex { patterns: Map<string, string[]>; frequencies: Map<string, number> }
export function wordPattern(word: string): string {
  const seen = new Map<string, number>()
  return [...word].map(letter => {
    if (letter === "'") return "'"
    if (!seen.has(letter)) seen.set(letter, seen.size)
    return seen.get(letter)
  }).join('.')
}
export function quoteWords(text: string, language: PuzzleLanguage): string[] {
  return text.toUpperCase().replaceAll('’', "'").match(language === 'ru' ? /[А-ЯЁ]+/g : /[A-Z]+(?:'[A-Z]+)*/g) ?? []
}
export function indexWords(entries: readonly LexiconEntry[]): WordIndex {
  const patterns = new Map<string, string[]>(), frequencies = new Map<string, number>()
  for (const entry of entries) {
    const word = entry.word.toUpperCase()
    if (frequencies.has(word)) continue
    frequencies.set(word, entry.frequency)
    const pattern = wordPattern(word)
    const group = patterns.get(pattern) ?? []
    group.push(word); patterns.set(pattern, group)
  }
  return { patterns, frequencies }
}
export interface AuditOptions { minimumFrequency?: number; maxWordLength?: number; maxUnknownPerWord?: number; budget?: number }
/** Editorial tool only. Variables happen to be answer letters; deductions never use their meaning. */
export function auditClues(text: string, language: PuzzleLanguage, clues: readonly string[], lexicon: WordIndex, options: AuditOptions = {}) {
  const words = quoteWords(text, language)
  const letters = [...new Set(words.join('').replaceAll("'", ''))]
  const known = new Map(clues.map(letter => [letter, letter]))
  const anchors = words.filter(word => (lexicon.frequencies.get(word) ?? 0) >= (options.minimumFrequency ?? (language === 'ru' ? 4.0 : 4.5)) && word.length <= (options.maxWordLength ?? (language === 'ru' ? 8 : 7)))
  const steps: { word: string; candidates: number; letters: string[] }[] = []
  let work = 0, exhausted = false, ambiguity = 0, contradiction = false
  for (let round = 0; round <= letters.length; round++) {
    let changed = false
    ambiguity = 0
    for (const word of anchors) {
      const unknown = [...new Set([...word].filter(letter => letter !== "'" && !known.has(letter)))]
      if (!unknown.length || unknown.length > (options.maxUnknownPerWord ?? 2)) continue
      const candidates: string[] = []
      for (const candidate of lexicon.patterns.get(wordPattern(word)) ?? []) {
        if (++work > (options.budget ?? 200_000)) { exhausted = true; break }
        const forward = new Map(known), reverse = new Map([...known].map(([key, value]) => [value, key]))
        let valid = true
        for (let i = 0; i < word.length; i++) {
          const symbol = word[i]!, letter = candidate[i]!
          if (symbol === "'") continue
          if ((forward.has(symbol) && forward.get(symbol) !== letter) || (reverse.has(letter) && reverse.get(letter) !== symbol)) { valid = false; break }
          forward.set(symbol, letter); reverse.set(letter, symbol)
        }
        if (valid) candidates.push(candidate)
      }
      if (exhausted) break
      if (!candidates.length) { contradiction = true; break }
      ambiguity += Math.log2(candidates.length)
      const added: string[] = []
      for (const symbol of unknown) {
        const i = word.indexOf(symbol), first = candidates[0]![i]!
        if (candidates.every(candidate => candidate[i] === first)) { known.set(symbol, first); added.push(symbol); changed = true }
      }
      if (added.length) steps.push({ word, candidates: candidates.length, letters: added })
    }
    if (!changed || exhausted || contradiction) break
  }
  const unresolved = letters.filter(letter => !known.has(letter))
  return { solved: !exhausted && !contradiction && !unresolved.length && letters.every(letter => known.get(letter) === letter), exhausted, contradiction, unresolved, work, ambiguity, steps, letters: letters.length, anchors: [...new Set(anchors)] }
}
/** Greedy, deterministic clue improvement for reviewed content; never runs during play. */
export function suggestClues(text: string, language: PuzzleLanguage, initial: readonly string[], lexicon: WordIndex) {
  const letters = [...new Set(quoteWords(text, language).join('').replaceAll("'", ''))]
  const clues = [...new Set(initial)]
  let audit = auditClues(text, language, clues, lexicon)
  while (!audit.solved && clues.length < letters.length - 2) {
    const ranked = letters.filter(letter => !clues.includes(letter)).map(letter => {
      const result = auditClues(text, language, [...clues, letter], lexicon)
      const occurrences = [...text.toUpperCase()].filter(char => char === letter).length
      return { letter, result, score: result.unresolved.length * 100 + result.ambiguity + occurrences / 100 }
    }).sort((a, b) => a.score - b.score || a.letter.localeCompare(b.letter, 'en'))
    if (!ranked[0]) break
    clues.push(ranked[0].letter); audit = ranked[0].result
  }
  return { clues, audit }
}
