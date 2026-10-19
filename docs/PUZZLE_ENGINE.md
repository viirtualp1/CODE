# CODE — puzzle engine specification

## Current slice
Pure TypeScript functions encode a curated quote with a seeded, deterministic permutation of 1–26 for English or 1–33 for Russian. Е and Ё are distinct. Omitted quote locale means legacy English; Russian records explicitly use locale:ru. Clues are fixed reviewed content, never selected randomly during play. Medium/Hard retain authored clues; Easy uses explicit sparse profiles with at most one additional reviewed anchor. The offline common-word audit is diagnostic and does not force clue expansion. Inspectable metadata explains the choice. Validate quote IDs, alphabet coverage, unique numeric mapping, clue presence and at least one editable symbol. UI and Pinia never implement their own cipher rules.

A session consists of puzzle ID, assignments keyed by numeric symbol, hint-lock symbols, undo/redo snapshots and a record version. Initial clues are derived from content rather than trusted from storage. Entry is atomic: validate selected symbol, puzzle-alphabet input, locked status and letter availability, then create one history entry. Clearing uses the same operation. Keep up to 100 history steps. Selection, active occurrence and check highlights are ephemeral. Check returns incorrect assigned symbols. Completion compares every used symbol against its solution.

Focus navigation is separate from assignment mutation. `apply` reports whether an edit changed the session; the app advances only successful regular letter edits. The pure `nextEmptyCell` helper scans occurrences after the actual focused index, wraps once and tests assignment presence, never solution correctness. This avoids jumping backward when a repeated symbol was selected late in the quote. The board owns DOM focus; phone layouts keep the whole quote visible without scrolling, while desktop overflow can reveal focus. Ordinary erase, hint, history and rejected/no-op edits do not auto-advance. Checked erase may focus a known marked occurrence, then clear it as a grouped edit. No blank means no focus change.

Storage is IndexedDB with a versioned database and one record per puzzle plus preferences. Writes are serialized to avoid an older asynchronous save overwriting a newer state. Reads validate all record fields and every history snapshot; unknown version, quote revision mismatch, invalid symbols, duplicate letters and changed clues trigger a safe reset. Progress is device-local; no sync, account or external service. Persist on each mutation, not only on unload.

## Future full fairness pipeline — beyond the limited Easy audit
1. **Audit** the bundled 100 English and 100 Russian excerpts. Record work, author, edition/translation, date, direct source, reuse rationale and jurisdiction review. Modern translations can remain copyrighted even for ancient authors. Avoid dubious attributions and modern quotation compilations. License status is content metadata, not an assumption based on an author's death.
2. **Normalize** uppercase A–Z while preserving editorial punctuation; normalize typographic apostrophes; reject unsupported letters, unsupported word lengths, obscurity, excessive proper names and fragments lacking context. Curate lengths initially around 40–120 letters; test shorter quotes separately.
3. **Analyze** word signatures (e.g. LETTER → 0.1.2.2.1.3), repeated words, distinct-letter count, frequency, common bigrams/trigrams, contractions, one-letter words and intersecting repeated symbols. Avoid relying on raw frequency alone.
4. **Solve heuristically** using bundled, licensed lexicons for each puzzle language indexed by length/signature. Constraint propagation intersects candidates with the global bijection; score language likelihood and use bounded branching with an explicit work budget. No external API, NLP model or heavy dependency for MVP.
5. **Choose clues strategically**: test each candidate reveal for reduction in candidate space and branch work, with preference for repeated anchor letters spanning several words. Evaluate combinations greedily with bounded look-ahead, never reveal letters randomly. Deterministic seed only breaks equally scored ties.
6. **Reject** unresolved ambiguity, budget-exhausted cases, unacceptable proper-name dependence, trivial fully exposed phrases and solutions that require unjustified guessing. A solver finding one answer is not a uniqueness proof. Flag equivalent valid sentences for editorial review; do not quietly accept only the stored wording.
7. **Calibrate** Easy/Medium/Hard against solver work plus human playtests. Easy: several anchors and mostly propagation. Medium: pattern reasoning with modest branching. Hard: fewer anchors and deeper but bounded inference; never ambiguity as a substitute for difficulty. Store measured solver version and metrics so difficulty is reproducible.

## Future acceptance criteria
- All shipped entries pass provenance review and deterministic validation.
- Identical content + engine version yields identical puzzle/clues/metrics.
- Every clue removes meaningful ambiguity; no random reveal policy.
- Solver respects a fixed operation budget and exposes “unknown” separately from “unsolvable.”
- Golden fixtures cover repeated letters/words, punctuation, contractions, proper nouns, short quotes, ambiguous alternatives and budget exhaustion.
- Human testing establishes difficulty ranges before labels are advertised as calibrated.

## Important decisions
Mapping is per puzzle, not global across the collection. Enforcing a one-to-one assignment is a structural rule, not an automatic mistake check. Incorrect hints are impossible because hints use the stored solution, but asking for one is always explicit. Undo restores the entire prior assignment/hint state, ensuring hints never become accidentally permanent. Corrupt storage must never manufacture valid-looking progress. A bounded pure engine supports later solver work without coupling it to Vue or persistence.

## Updating the app
Update metadata and UI do not modify puzzle rules or the IndexedDB schema. A requested PWA update first disables gameplay and awaits the serialized write queue. Only successful saving allows service-worker activation and reload. Quote revisions still control progress compatibility independently of app versions. Ordinary UI releases must not change quote IDs/revisions or clear storage.

## Localization and explicit-check deletion
Engine failures return reason keys/parameters; translation belongs to the store/UI. Alphabet configuration lives in engine/alphabet.ts with no Vue dependency. Preserve all legacy English permutations; the v0.2.4 golden mapping fixture is a compatibility gate. Preferences v2 adds language/lastPuzzle but database and session envelopes stay version 1; unversioned preferences migrate explicitly.

nextCheckedCell accepts only the explicit checked-symbol set and actual focused occurrence. Prefer the current occurrence when marked; otherwise scan forward and wrap once. Do not compare guesses to the solution in this navigation. eraseChecked removes one marked assignment through the existing edit/history path, keeping other known check marks. Unmarked/correct/clue assignments are never deleted by this mode; ordinary erase remains available when no marks exist. Undo restores the deleted mapping atomically and clears ephemeral verdicts.

## Earlier Easy audit — 0.4.0 (superseded clue policy)

engine/fairness.ts is a pure developer tool, not imported by gameplay. scripts/audit-content.mjs loads pinned, attributed wordfreq-derived TSV frequency lists from scripts/lexicons. npm run content:audit now reports limited propagation diagnostically; --prepare is retired and rejects automatic regeneration. Keep the broad candidate lists independent of the quote corpus; never append target answers to make a test pass.

Word signatures preserve repeated letters and apostrophes. Candidate words must match known bindings and the inverse one-to-one map. Intersect candidate letters, propagate forced bindings, and stop at a fixed point or 200,000 candidate checks. No branching, likelihood guessing, semantic oracle or implicit gameplay checking. Only high-frequency short anchor words with at most two unknown variables drive Easy deductions. Other words can be decoded by shared letters without knowing their vocabulary. A deterministic greedy review helper evaluates each additional clue by unresolved variables and candidate ambiguity, breaking ties reproducibly. Profiles remain bundled static data.

The dictionary is finite and frequency-based, not a language completeness proof. Passing certifies this bounded common-word route; it does not prove universal uniqueness or predict every person's vocabulary. Human feedback still calibrates difficulty. Medium/Hard are explicitly editorial, with rare/contextual entries kept out of Easy.

## Compatible clue revision and backup format

Published quote answers/IDs and all numeric permutations remain stable. A quote with expanded Easy givens has revision 2 and previousClues containing its published revision-1 givens. decodeSession only accepts this explicit 1→2 transition after validating against the full old puzzle contract. migrateClues merges new givens into every snapshot, removes only assignments reserving their letters for another symbol, converts now-given hints to initial clues, deduplicates redundant history and validates again. Write upgraded envelopes back. All other revision/schema mismatches remain incompatible. Database schema 1 and session envelope 1 are unchanged; quote revision 2 is the compatibility boundary.

Backup format: {format:'code-progress',version:1,createdAt,appVersion,resume?:{en?,ru?},records:[{id,version:1,revision,session}]}. Export only started/completed sessions. Validation caps files at 16 MiB and 1000 records, rejects duplicate IDs/corrupt known sessions/unsupported formats, and reports unavailable future content separately. Compatible old clues use the same migration. Optional resume pointers must name compatible saved records in the correct language. Unavailable puzzles never delete local records.

Default merge keeps every locally started/completed session; an explicit replacement checkbox may replace conflicts. Recompute the plan at confirmation. Serialized writeRecords commits the entire merged in-memory state and preferences in one transaction; only oncomplete updates Pinia. Abort queued/active restore work at 30 seconds, with cancellation checked before a queued job starts, so no late write can replace progress after a reported cancellation. Exports remain available when IndexedDB fails. This is a file backup, not cross-tab/live sync.


## Current sparse clues and revision compatibility — 0.4.1

User feedback prioritises challenge close to the original game. Profiles retain authored clues and at most one extra Easy anchor, taken from the earlier reviewed sequence; no new random clues or runtime generator. Do not use solver completion to expand these profiles. The limited diagnostic may leave unresolved symbols, requiring broader reasoning/vocabulary.

Quote.previousClues maps explicitly supported old revision numbers to their original clue arrays. The 40 changed profiles have revision 3, accepting revision 1 (published givens) and revision 2 (expanded givens from legacy-clues-v2.json). decodeSession passes the saved revision to migrateClues; imports use this same whitelist. Validate the whole old session first. Strip withdrawn automatic givens from each unfinished snapshot, add current givens, remove only structural conflicts, keep actual guesses/hints, deduplicate redundant history and revalidate. For a completed snapshot retain all solved entries, with withdrawn givens becoming ordinary editable assignments. Reset/restart always uses current sparse givens.

Next-puzzle selection sorts IDs by a fixed mixed hash, rotates after the current ID, excludes completed sessions and prefers a different difficulty and author. Different difficulty wins if both cannot change; then another author/any unfinished puzzle. All-complete wraps, and a single-entry collection stays on its entry. No reshuffle on reload, changed numbering or additional persistence state.
