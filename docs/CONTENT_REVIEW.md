# Offline editorial review

`npm run content:review` reviews just Hamlet and Pushkin by default. Use `npm run content:review -- --id=hamlet-possibility --out=work/review.json` for a selected puzzle. `--all` is an explicit opt-in; normal tests/builds never traverse the corpus with the search. Output files must be under ignored work/.

The pure developer module src/engine/content-review.ts uses the attributed frequency lists documented in scripts/lexicons. No network, quote-answer corpus, app runtime import or content mutation. Starting clues, labels, quote IDs and numeric mappings are never changed by a review.

Search indexes complete word patterns, preserves apostrophes and Е/Ё, and enforces one global forward/inverse substitution. It propagates shared-symbol domains, chooses the smallest remaining word domain, branches in frequency order and prunes contradictions. CLI limits: 200,000 candidate checks, 1,000 nodes, depth 20 and three complete candidate readings. Every stopping reason is explicit. The same input/lexicon/options produces the same result.

The JSON includes candidate texts, average word-frequency score, solution branch depth, deepest explored branch, candidate work, search nodes, propagation assignments, dead ends and missing source words. Frequency ranks candidates for review; it is not a grammatical or semantic model. A complete dictionary reading may be nonsense. Missing inflections/proper names remain dictionary gaps; source words are never injected to make the search succeed.

Interpret statuses carefully:

- multiple: at least two complete dictionary-consistent readings were found. Review them manually; this alone does not prove an unfair puzzle.
- single-in-lexicon: this bounded search finished and found one reading in this finite dictionary. It does not prove uniqueness in English/Russian.
- none-in-lexicon: the search finished with no dictionary-consistent reading. It does not prove the puzzle unsolvable.
- inconclusive: a search limit or vocabulary gap prevents a stronger statement. Never silently convert this to success or failure.

Review flags identify alternative readings, dictionary gaps, reached limits, deeper search (four or more branch choices) and absent dictionary solutions. These are editorial signals, not calibrated difficulty ratings. Keep the sparse clue policy; do not expand clues until a solver can finish. Human playtesting still decides whether difficulty feels interesting.

## Automatic GitHub reports

The CI workflow includes a **Content review** job on pushes and pull requests. Its cheap change-selection step runs first; installing dictionaries/dependencies and running the solver happen only for relevant changes. UI, SCSS, ordinary release notes, storage, documentation and gameplay sequencing changes do not trigger this analysis. Normal CI tests/builds still run as before.

- New/changed quote text, alphabet/locale, starting clues or difficulty: review only those current puzzle IDs. Compare the actual exported content against the base commit, so a metadata-only edit or clue reordering does not cause a solver run. Deleted entries are reported without solving removed content.
- Analyzer/cipher/alphabet code, review tooling or frequency TSV changes: add just two representative samples (English and Russian), not the whole collection. Changed quote IDs are included as well, without duplicates.
- No usable comparison baseline: report that limitation and review only representative samples. No automatic full-corpus fallback.

For a push, comparison uses the previous commit supplied by GitHub. For a pull request it uses the PR base commit and checked-out merge result. A new branch uses its merge base with origin/main. Snapshot extraction is limited to bundled data files; no separate checkout or progress data is modified.

Open the run under GitHub → Actions → CI → Summary. The summary shows stable language/puzzle numbers, authors, search results/flags and expandable source/candidate texts. Download **code-content-review** from **Artifacts** for report.json and report.md (retained 30 days). The report is attached to the exact commit and does not post PR comments or change content.

Multiple candidates, vocabulary gaps and budget exhaustion are manual-review signals, not automatic red CI. A broken script, invalid content or failed execution still fails the job. A single finite-dictionary result is not human-language certification.

## Local use

```sh
# Two representative examples; inspect the JSON printed in the terminal.
npm run content:review

# One chosen puzzle, with full source and candidate texts saved locally.
npm run content:review -- --id=hamlet-possibility --out=work/review.json

# Commit-scoped selection, using the current branch against origin/main by default.
npm run content:review:ci
```

The commit-scoped command reads committed changes; use the direct command for edits that are not committed yet. Generated CI-style files are in work/ci-content-review/. For later implementation sessions: after changing analyzer logic, run the two samples; after adding/changing quote inputs, review just those IDs. UI-only changes need no content-review run. Do not use --all unless explicitly requested.
