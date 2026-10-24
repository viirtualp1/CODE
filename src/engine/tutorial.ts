import { createPuzzle } from './cipher'

/** Author-created practice phrases, using exactly the production mapping/edit rules. */
export function tutorialPuzzle(locale: 'en' | 'ru') {
  return createPuzzle({ locale, id: `practice-${locale}`, revision: 1, text: locale === 'en' ? 'Too hot.' : 'Тот кот.', clues: [locale === 'en' ? 'T' : 'Т'], author: '', work: '', year: 2026, difficulty: 'Easy', source: '', reuse: 'Original practice phrase.', clueRationale: 'One immutable clue; two editable symbols, including a repeated vowel.' })
}
