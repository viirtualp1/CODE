import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const corpus = await server.ssrLoadModule('/src/data/puzzles.ts')
  const quotes = process.argv.includes('--prepare') || process.argv.includes('--candidates') ? corpus.publishedQuotes : corpus.quotes
  const { indexWords, quoteWords, suggestClues, auditClues } = await server.ssrLoadModule('/src/engine/fairness.ts')
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
  } else if (process.argv.includes('--prepare')) {
    const selected = JSON.parse(await readFile(new URL('./easy-selection.json',import.meta.url),'utf8'))
    const profiles={}
    for (const quote of quotes) {
      const language=quote.locale??'en', index=lexicons[language]
      if (!selected.easy.includes(quote.id)) {
        profiles[quote.id]={ difficulty:selected.hard.includes(quote.id)?'Hard':'Medium', clues:quote.clues }
        continue
      }
      const result=suggestClues(quote.text,language,quote.clues,index)
      if (!result.audit.solved || result.audit.steps.length===0) { console.error(`FAILED ${quote.id}: ${result.audit.unresolved.join('')}`); continue }
      profiles[quote.id]={difficulty:'Easy',clues:result.clues,audit:{version:1,work:result.audit.work,steps:result.audit.steps.length,unresolved:result.audit.unresolved.length,anchors:result.audit.anchors}}
      console.log(quote.id, result.clues.join(''), 'hidden', result.audit.letters-result.clues.length, 'steps',result.audit.steps.length)
    }
    if (Object.values(profiles).filter(p => p.difficulty === 'Easy').length !== selected.easy.length) throw new Error('Review failed Easy candidates')
    await writeFile(new URL('../src/data/clue-profiles.json',import.meta.url),JSON.stringify(profiles,null,2)+'\n')
  } else {
    let checked=0
    for (const quote of quotes.filter(q=>q.difficulty==='Easy')) {
      const result=auditClues(quote.text,quote.locale??'en',quote.clues,lexicons[quote.locale??'en'])
      if (!result.solved || !result.steps.length) throw new Error(`Easy audit failed: ${quote.id}`)
      checked++
    }
    console.log(`${checked} Easy puzzles pass bounded common-word deduction; no quote-recognition corpus or network used.`)
  }
} finally { await server.close() }
