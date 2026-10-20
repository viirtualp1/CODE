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
