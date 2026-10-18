export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export interface Quote {
  id: string
  revision: number
  text: string
  author: string
  work: string
  year: number
  difficulty: Difficulty
  clues: string[]
  clueRationale: string
  source: string
  reuse: string
}

// Excerpts from original English works published before 1931. Review non-US release jurisdictions.
export const quotes: Quote[] = [
  { id: 'austen-heart', revision: 1, text: 'There is no charm equal to tenderness of heart.', author: 'Jane Austen', work: 'Emma', year: 1815, difficulty: 'Easy', clues: ['E', 'T', 'R'], clueRationale: 'E and R link the repeated ending in THERE and TENDERNESS; T anchors TO and HEART. These span the sentence without exposing the key noun.', source: 'https://www.gutenberg.org/ebooks/158', reuse: 'Original English, 1815; public domain in the US. Austen died 1817.' },
  { id: 'hamlet-possibility', revision: 1, text: 'We know what we are, but know not what we may be.', author: 'William Shakespeare', work: 'Hamlet · Act IV, scene V', year: 1603, difficulty: 'Easy', clues: ['W', 'E'], clueRationale: 'Repeated WE and WHAT connect the sentence; short words provide useful anchors for the remaining consonants.', source: 'https://www.gutenberg.org/ebooks/1524', reuse: 'Original English play, 1603; public domain.' },
  { id: 'alcott-storms', revision: 1, text: "I'm not afraid of storms, for I'm learning how to sail my ship.", author: 'Louisa May Alcott', work: 'Little Women', year: 1868, difficulty: 'Medium', clues: ['I', 'O'], clueRationale: 'I anchors the repeated contraction; O connects OF, FOR, HOW and TO while preserving the main word patterns.', source: 'https://www.gutenberg.org/ebooks/514', reuse: 'Original English, 1868–1869; public domain in the US. Alcott died 1888.' },
  { id: 'carroll-yesterday', revision: 1, text: "It's no use going back to yesterday, because I was a different person then.", author: 'Lewis Carroll', work: 'Alice’s Adventures in Wonderland', year: 1865, difficulty: 'Medium', clues: ['I', 'E'], clueRationale: 'I anchors both the contraction and single-letter word; repeated E crosses long words without exposing the key phrase.', source: 'https://www.gutenberg.org/ebooks/11', reuse: 'Original English, 1865; public domain in the US. Carroll died 1898.' },
  { id: 'wilde-living', revision: 1, text: 'To live is the rarest thing in the world. Most people exist, that is all.', author: 'Oscar Wilde', work: 'The Soul of Man Under Socialism', year: 1891, difficulty: 'Hard', clues: ['T'], clueRationale: 'T links THE, THAT and THING; repeated words and IS provide fair patterns without broad vowel disclosure.', source: 'https://www.gutenberg.org/ebooks/1017', reuse: 'Original English essay, 1891; public domain in the US. Wilde died 1900.' },
  { id: 'thoreau-truth', revision: 1, text: 'Rather than love, than money, than fame, give me truth.', author: 'Henry David Thoreau', work: 'Walden', year: 1854, difficulty: 'Hard', clues: ['A'], clueRationale: 'A connects repeated THAN with RATHER and FAME; repetition supplies an anchor without uncovering the short words.', source: 'https://www.gutenberg.org/ebooks/205', reuse: 'Original English, 1854; public domain in the US. Thoreau died 1862.' },
]
