const quoteFile = path => /^src\/data\/.+\.(ts|json)$/.test(path) && !['src/data/releases.json', 'src/data/legacy-clues-v2.json'].includes(path)
const algorithmFiles = new Set(['src/engine/content-review.ts', 'src/engine/fairness.ts', 'src/engine/alphabet.ts', 'src/engine/cipher.ts', 'scripts/review-content.mjs', 'scripts/review-ci.mjs', 'scripts/review-ci-lib.mjs'])
export function reviewScope(paths) {
  const content = paths.filter(path => quoteFile(path))
  const algorithm = paths.filter(path => algorithmFiles.has(path) || /^scripts\/lexicons\/[^/]+\.tsv$/.test(path))
  return { run: !!(content.length + algorithm.length), content, algorithm }
}
const signature = quote => JSON.stringify([quote.locale ?? 'en', quote.text, [...quote.clues].sort(), quote.difficulty])
export function selectReview(current, previous, scope) {
  const older = new Map((previous ?? []).map(quote => [quote.id, quote]))
  const changed = previous ? current.filter(quote => !older.has(quote.id) || signature(quote) !== signature(older.get(quote.id))).map(quote => quote.id) : []
  const ids = new Set(changed)
  const samples = []
  if (scope.algorithm.length || !previous) {
    for (const [locale, preferred] of [['en', 'hamlet-possibility'], ['ru', 'ru-pushkin-morning']]) {
      const quote = current.find(quote => quote.id === preferred && (quote.locale ?? 'en') === locale) ?? current.find(quote => (quote.locale ?? 'en') === locale)
      if (quote && !ids.has(quote.id)) { ids.add(quote.id); samples.push(quote.id) }
    }
  }
  const currentIds = new Set(current.map(quote => quote.id))
  return { ids: [...ids], changed, samples, removed: (previous ?? []).filter(quote => !currentIds.has(quote.id)).map(quote => quote.id), baselineAvailable: !!previous }
}
const label = puzzle => puzzle.number ? `${puzzle.locale.toUpperCase()} ${String(puzzle.number).padStart(3, '0')} · ${puzzle.author ?? puzzle.id}` : puzzle.id
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '\\|').replaceAll('`', '\\`').replace(/[\r\n]+/g, ' ')
export function reviewSummary(report) {
  const lines = ['# Content review', '', `Reviewed **${report.puzzles.length}** puzzles: ${report.selection.changed.length} added/changed, ${report.selection.samples.length} algorithm samples.`, '', 'These are editorial signals. Dictionary candidates may be ungrammatical; an incomplete search is not a failed puzzle. No clues or difficulty labels were changed.', '']
  lines.push('**How to read:** multiple = several dictionary readings; inconclusive = a search limit or vocabulary gap. single-in-lexicon / none-in-lexicon describe only this dictionary. limit-solutions means the candidate list was capped, not that the puzzle failed.', '')
  if (!report.selection.baselineAvailable) lines.push('No comparable baseline was available; only representative samples were reviewed.', '')
  if (report.selection.removed.length) lines.push(`Removed IDs: ${report.selection.removed.map(escape).join(', ')}.`, '')
  if (!report.puzzles.length) lines.push('No puzzle inputs changed; no solver search was run.', '')
  else {
    lines.push('| Puzzle | Language | Result | Candidates | Depth | Work | Review flags |', '| --- | --- | --- | ---: | ---: | ---: | --- |')
    for (const puzzle of report.puzzles) lines.push(`| ${escape(label(puzzle))} | ${escape(puzzle.locale)} | ${escape(puzzle.status)} | ${puzzle.candidates.length} | ${puzzle.maxBranchDepth} | ${puzzle.work} | ${puzzle.flags.map(escape).join(', ') || '—'} |`)
  }
  for (const puzzle of report.puzzles) {
    lines.push('', '<details>', `<summary>${escape(label(puzzle))} — candidate readings</summary>`, '')
    if (puzzle.text) lines.push(`Original: ${escape(puzzle.text)}`, '')
    if (!puzzle.candidates.length) lines.push('No complete candidate was found within this search. See the flags; this does not prove the puzzle unsolvable.', '')
    puzzle.candidates.forEach((candidate, index) => lines.push(`${index + 1}. ${escape(candidate.text)} (branch depth ${candidate.branchDepth})`))
    lines.push('', '</details>')
  }
  lines.push('', 'Download **code-content-review** in the run’s Artifacts section for full candidate texts and search limits (`report.json`) and this summary (`report.md`).', '')
  return lines.join('\n')
}
