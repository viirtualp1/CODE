import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const corpus = await server.ssrLoadModule('/src/data/puzzles.ts')
  if (process.argv.includes('--prepare')) throw new Error('Automatic clue expansion is retired. Edit the sparse fixed profiles explicitly.')
  const quotes = process.argv.includes('--candidates') ? corpus.publishedQuotes : corpus.quotes
  const { indexWords, quoteWords, auditClues } = await server.ssrLoadModule('/src/engine/fairness.ts')
  const lexicons = {}
  for (const language of ['en', 'ru']) {
    const text = await readFile(new URL(`./lexicons/${language}.tsv`, import.meta.url), 'utf8')
    lexicons[language] = indexWords(text.trim().split('\n').map(line => { const [word, frequency] = line.split('\t'); return { word, frequency: Number(frequency) } }))
  }
  if (process.argv.includes('--candidates')) {
    for (const language of ['en', 'ru']) {
      console.log('\n'+language)
      quotes.filter(q => (q.locale ?? 'en') === language).forEach((quote,i) => {
        const words=quoteWords(quote.text,language), index=lexicons[language]
        const common=words.filter(w=>(index.frequencies.get(w)??0)>=4.5 && w.length<=7).length
        console.log(`${String(i+1).padStart(3)} ${quote.id} [${common}/${words.length}] ${quote.text}`)
      })
    }
    process.exitCode=0
  } else {
    let checked=0, propagated=0
    for (const quote of quotes.filter(q=>q.difficulty==='Easy')) {
      const result=auditClues(quote.text,quote.locale??'en',quote.clues,lexicons[quote.locale??'en'])
      if (result.solved) propagated++
      checked++
    }
    console.log(`${checked} sparse Easy profiles: ${propagated} fully propagate in the limited common-word model; ${checked-propagated} require broader reasoning. Diagnostic only; no automatic clue expansion.`)
  }
} finally { await server.close() }
