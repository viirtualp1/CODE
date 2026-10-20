import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'
const args = process.argv.slice(2)
if (args.some(arg => arg !== '--all' && !arg.startsWith('--id=') && !arg.startsWith('--out='))) throw new Error('Use --id=id1,id2, --all, --out=work/review.json')
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
try {
  const { quotes } = await server.ssrLoadModule('/src/data/puzzles.ts')
  const { indexWords } = await server.ssrLoadModule('/src/engine/fairness.ts')
  const { reviewContent } = await server.ssrLoadModule('/src/engine/content-review.ts')
  const ids = (args.find(arg => arg.startsWith('--id='))?.slice(5) ?? 'hamlet-possibility,ru-pushkin-morning').split(',')
  const selected = args.includes('--all') ? quotes : ids.map(id => { const quote = quotes.find(quote => quote.id === id); if (!quote) throw new Error(`Unknown puzzle: ${id}`); return quote })
  const lexicons = {}
  for (const locale of [...new Set(selected.map(quote => quote.locale ?? 'en'))]) {
    const text = await readFile(new URL(`./lexicons/${locale}.tsv`, import.meta.url), 'utf8')
    lexicons[locale] = indexWords(text.trim().split('\n').map(line => { const [word, frequency] = line.split('\t'); return { word, frequency: Number(frequency) } }))
  }
  const report = { version: 1, limitation: 'Dictionary-constrained candidates can be ungrammatical. This is not exhaustive natural-language uniqueness or calibrated human difficulty. No content is modified.', puzzles: selected.map(quote => ({ id: quote.id, locale: quote.locale ?? 'en', difficulty: quote.difficulty, clues: quote.clues, ...reviewContent(quote.text, quote.locale ?? 'en', quote.clues, lexicons[quote.locale ?? 'en'], { budget: 200_000 }) })) }
  const output = JSON.stringify(report, null, 2) + '\n'
  const path = args.find(arg => arg.startsWith('--out='))?.slice(6)
  if (path) { const destination = resolve(path); if (!destination.startsWith(resolve('work') + '/')) throw new Error('Write reports under ignored work/'); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, output); console.log(`Review written to ${path} (${selected.length} puzzles).`) }
  else console.log(output)
} finally { await server.close() }
