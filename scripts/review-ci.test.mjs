import assert from 'node:assert/strict'
import test from 'node:test'
import { reviewScope, reviewSummary, selectReview } from './review-ci-lib.mjs'
const quotes = [
  { id: 'hamlet-possibility', text: 'We know.', clues: ['W'], difficulty: 'Easy' },
  { id: 'ru-pushkin-morning', locale: 'ru', text: 'Мороз.', clues: ['М'], difficulty: 'Easy' },
]
test('only quote inputs, lexicons and analyzer changes require review', () => {
  assert.equal(reviewScope(['src/App.vue', 'src/styles/main.scss', 'src/data/releases.json', 'docs/DESIGN.md']).run, false)
  assert.equal(reviewScope(['src/engine/content-review.ts']).run, true)
  assert.equal(reviewScope(['scripts/lexicons/ru.tsv']).run, true)
  assert.equal(reviewScope(['scripts/lexicons/README.md']).run, false)
  assert.equal(reviewScope(['src/data/english-expansion.json']).run, true)
  assert.equal(reviewScope(['src/data/new-anthology.json']).run, true)
})
test('reviews only added or substantively changed quotes, excluding metadata and clue reordering', () => {
  const current = [{ ...quotes[0], source: 'new source' }, { ...quotes[1], clues: ['М', 'О'] }, { ...quotes[0], id: 'new-quote' }]
  const selection = selectReview(current, quotes, reviewScope(['src/data/clue-profiles.json']))
  assert.deepEqual(selection.ids, ['ru-pushkin-morning', 'new-quote'])
  assert.deepEqual(selection.samples, [])
  assert.deepEqual(selectReview([{ ...quotes[0], clues: ['W', 'E'] }], [{ ...quotes[0], clues: ['E', 'W'] }], { algorithm: [] }).ids, [])
})
test('algorithm changes add only two representative samples and do not duplicate changed IDs', () => {
  const current = [{ ...quotes[0], text: 'We changed.' }, quotes[1]]
  const selection = selectReview(current, quotes, reviewScope(['src/engine/fairness.ts']))
  assert.deepEqual(selection.ids, ['hamlet-possibility', 'ru-pushkin-morning'])
  assert.deepEqual(selection.samples, ['ru-pushkin-morning'])
  assert.deepEqual(selectReview(quotes, null, { algorithm: [] }).ids, ['hamlet-possibility', 'ru-pushkin-morning'])
  assert.deepEqual(selectReview([quotes[1]], quotes, { algorithm: [] }).removed, ['hamlet-possibility'])
})
test('summaries keep uncertainty visible and escape quote-derived Markdown/HTML', () => {
  const selection = { changed: ['x'], samples: [], removed: [], baselineAvailable: true }
  const summary = reviewSummary({ selection, puzzles: [{ id: '<x>|\n', locale: 'en', status: 'inconclusive', candidates: [], maxBranchDepth: 2, work: 10, flags: ['limit-work'] }] })
  assert.match(summary, /inconclusive/)
  assert.match(summary, /incomplete search is not a failed puzzle/)
  assert.ok(!summary.includes('<x>'))
  assert.ok(summary.includes('&lt;x&gt;\\|'))
})
