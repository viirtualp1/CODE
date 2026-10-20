import { execFileSync } from 'node:child_process'
import { appendFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { reviewScope, reviewSummary, selectReview } from './review-ci-lib.mjs'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trimEnd()
const commit = value => { if (!/^[a-f0-9]{7,64}$/i.test(value)) throw new Error('Expected a commit SHA'); return git('rev-parse', '--verify', `${value}^{commit}`) }
const directory = 'work/ci-content-review'
const planPath = `${directory}/plan.json`
const mode = process.argv[2] ?? 'run'
if (!['plan', 'run'].includes(mode)) throw new Error('Use plan or run')
await mkdir(directory, { recursive: true })
if (mode === 'plan') {
  await Promise.all(['report.json', 'report.md'].map(file => rm(join(directory, file), { force: true })))
  const head = commit(process.env.REVIEW_HEAD || git('rev-parse', 'HEAD'))
  let base = process.env.REVIEW_BASE
  if (!base || /^0+$/.test(base)) {
    try { base = git('merge-base', head, 'origin/main') } catch { base = undefined }
  }
  base = base ? commit(base) : null
  const paths = (base ? git('diff', '--name-only', '-z', base, head) : git('ls-tree', '-r', '--name-only', '-z', head)).split('\0').filter(Boolean)
  const plan = { base, head, ...reviewScope(paths) }
  await writeFile(planPath, JSON.stringify(plan, null, 2) + '\n')
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `run=${plan.run}\n`)
  if (!plan.run && process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '# Content review\n\nSkipped: no quote inputs, dictionaries or analyzer code changed.\n')
  console.log(plan.run ? 'Content review required.' : 'Content review skipped: unrelated changes.')
} else {
  const plan = JSON.parse(await readFile(planPath, 'utf8'))
  if (!plan.run) { console.log('No solver search needed.'); process.exit(0) }
  if (commit(git('rev-parse', 'HEAD')) !== plan.head) throw new Error('Review plan is stale; regenerate it for this checkout')
  const { createServer } = await import('vite')
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  const baseline = await mkdtemp(join(tmpdir(), 'code-review-base-'))
  try {
    const { quotes } = await server.ssrLoadModule('/src/data/puzzles.ts')
    let previous = null
    if (plan.base) {
      const files = git('ls-tree', '-r', '--name-only', plan.base, '--', 'src/data').split('\n').filter(file => /^src\/data\/.+\.(ts|json)$/.test(file))
      for (const file of files) {
        const destination = join(baseline, file.slice('src/data/'.length))
        await mkdir(dirname(destination), { recursive: true })
        await writeFile(destination, git('show', `${plan.base}:${file}`))
      }
      if (files.includes('src/data/puzzles.ts')) previous = (await server.ssrLoadModule(join(baseline, 'puzzles.ts'))).quotes
    }
    const selection = selectReview(quotes, previous, plan)
    const selected = selection.ids.map(id => quotes.find(quote => quote.id === id))
    const { indexWords } = await server.ssrLoadModule('/src/engine/fairness.ts')
    const { reviewContent } = await server.ssrLoadModule('/src/engine/content-review.ts')
    const lexicons = {}
    for (const locale of [...new Set(selected.map(quote => quote.locale ?? 'en'))]) {
      const text = await readFile(new URL(`./lexicons/${locale}.tsv`, import.meta.url), 'utf8')
      lexicons[locale] = indexWords(text.trim().split('\n').map(line => { const [word, frequency] = line.split('\t'); return { word, frequency: Number(frequency) } }))
    }
    const report = { version: 1, base: plan.base, head: plan.head, selection,
      limitation: 'Finite-dictionary readings can be ungrammatical. Limits and missing words do not prove a puzzle unsolvable. No content is modified.',
      puzzles: selected.map(quote => ({ id: quote.id, number: quotes.filter(item => (item.locale ?? 'en') === (quote.locale ?? 'en')).findIndex(item => item.id === quote.id) + 1, author: quote.author, text: quote.text, locale: quote.locale ?? 'en', difficulty: quote.difficulty, clues: quote.clues, ...reviewContent(quote.text, quote.locale ?? 'en', quote.clues, lexicons[quote.locale ?? 'en'], { budget: 200_000 }) })),
    }
    const summary = reviewSummary(report)
    await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2) + '\n')
    await writeFile(`${directory}/report.md`, summary)
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
    console.log(`Reviewed ${report.puzzles.length} selected puzzles; reports in ${directory}.`)
  } finally { await server.close(); await rm(baseline, { recursive: true, force: true }) }
}
