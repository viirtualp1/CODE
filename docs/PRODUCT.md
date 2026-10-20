# CODE — product specification

## Promise
A quiet, premium English and Russian cryptogram game for Android. Solve a sentence by finding the letter behind each number. No ads, subscription, currencies, paid features, account, network dependency or timer pressure.

## First vertical slice
A complete local session: 200 public-domain literary passages (100 English, 100 Russian originals), Easy/Medium/Hard labels with hand-authored clues, consistent substitution, custom keyboard, physical keyboard, selection, grouped entry, erase, undo/redo, optional checking, a confirmed hint, completion, puzzle selection and reset. Resume each puzzle through IndexedDB. Include a floating menu button with an animated left drawer, light/dark/system preference and optional haptics. App shell installability and offline caching through a PWA. No statistics, advanced generator, remote quote service or Android wrapper.

Easy has 20 entries per language with sparse authored clues and at most one extra reviewed anchor. Medium/Hard keep their original clues. All difficulty labels are editorial; vocabulary and contextual inference may matter at every level. Following user feedback, do not expand clues until a limited solver can finish the quote. There is no exhaustive uniqueness or human calibration guarantee. There is no scheduled daily service in this slice. Puzzle numbers are stable collection positions. All answers ship with the application.

## Session contract
- Each English A–Z letter has a distinct symbol in 1–26; Russian А–Я plus Ё uses 1–33, keeping Е and Ё distinct; punctuation and spaces are literal. Mapping remains stable across reloads.
- Selecting an editable cell selects its symbol and highlights every occurrence. Accepted letter entry moves actual focus to the next empty occurrence to the right in reading order, skipping filled symbols, clues and punctuation, and wrapping once at the end. Enter performs the same navigation. A rejected or unchanged entry and ordinary erase retain selection. Checked-mistake erase can move to the next explicitly marked occurrence. If all symbols are filled, keep selection; correctness never determines where to move.
- Enter A–Z or erase globally for that symbol. A letter already used by another symbol is refused with a neutral explanation; this enforces the bijection without judging correctness. Initial clues and hint letters are locked.
- Guesses look neutral. Check is explicit and marks incorrect *current assignments*. Any ordinary edit, undo or redo clears the check result. While explicit mistakes remain marked, erase clears one marked assignment and focuses that occurrence, retaining other marks. It never checks unmarked guesses. Correct guesses receive no unsolicited green feedback.
- Undo/redo operates on one whole mapping edit, including a hint; new edits invalidate redo. Clues are never undoable. A hint confirms before revealing the selected editable symbol (including an existing guess), or the first unanswered editable symbol when selection is unavailable. A hinted symbol is locked until that hint is undone. No hint counters or penalties.
- Completion requires all substitutions to match the solution. Fade the cipher into a clean sentence-case quotation with no numbers or underlines; replace the keyboard with Next puzzle, retain attribution, and retain undo/restart/library controls. Undoing completion brings back the keyboard.
- Restart requires confirmation and resets that puzzle's saved progress. Switching puzzles preserves each session. No destructive actions on opening a dialog.

## Recovery and accessibility
- No selected symbol: keys disabled, descriptive prompt visible. Selecting a clue may explain it without accepting input.
- Non-Latin physical layouts use English QWERTY key positions, while Latin layout characters retain their meaning. Missing physical codes produce visible guidance. Cell clicks explicitly take focus on Safari/macOS.
- Game cells/custom keys remain buttons, with no hidden text input or contenteditable transport. Native IME must not be requested during gameplay. A failed save still shows a warning; routine saving gets no label.
- Arrow keys navigate editable occurrences: left/right follow reading order, up/down choose the nearest cell on the adjacent visual row. Home/End select the first/last editable cell; boundaries do not wrap. Use one roving board tab stop. Letter input auto-advances; arrow navigation can revisit filled guesses for replacement.
- A floating upper-left hamburger opens an animated modal left drawer with CODE branding, current puzzle, collection, help, settings and appearance. No persistent masthead, rail or card; the menu target is fixed at top:0/left:0. Show a small noninteractive puzzle number and difficulty at the upper right, aligned with the menu, without a bar or divider. Full puzzle details and collection position live in the drawer. The keyboard has no mode tabs or selected-symbol header; erase sits directly above Enter on the right.
- Modals lock body and document scroll, preserve scrollbar spacing and restore the exact scroll position, prior inline styles and opening control focus on close. Modal contents remain scrollable.
- Ignore physical keys while a dialog is open or focus is in a text field; support Backspace/Delete, Escape and normal undo/redo shortcuts.
- Refresh retains assignments, hints, undo/redo and the last puzzle. Selection may reset safely. Validate persisted data against current quote IDs, mappings, clue locks and schema. Corrupt/incompatible records are discarded without crashing. Write failure shows a persistent in-app notice; play continues in memory.
- Announce selection, refused duplicates, hint/check/completion and save failure through a polite live region. Do not announce every matching cell separately.
- Keyboard-operable controls, visible focus, accessible names, 44px minimum control targets (48px preferred); dense cipher cells and QWERTY keys use 24px+ widths with gaps and 50–68px portrait key height (44px in landscape), contrast at WCAG AA, reduced motion, no reliance on color alone. System font scaling must reflow without clipped text.

## Acceptance gates
1. Every sample fits intact at 360×640, 360×800, 412×915, 480×960 and 915×412: no horizontal or vertical document/quote scrolling, no clipped words, keyboard and selected cells visible. Portrait quotes use the largest size that fits their actual text and available area, with 25–32px letters on roomy phone layouts instead of a blanket compact mode. Short phone layouts retain the author and move work/year to the drawer. Long dialogs may scroll internally.
2. Repeated symbols update together; wrong input stays neutral until Check; duplicate assignments cannot violate bijection.
3. Undo, redo, hint undo, reload, puzzle switching, restart and completion preserve the session contract.
4. Built PWA works offline after the first successful online load. Check quietly on visible return, reconnection and every visible minute. Only a dot on the menu advertises availability during play. What’s new contains version/history/manual check/apply. Apply freezes input, flushes pending writes, waits for actual activation and then reloads once. A failure retains progress and permits retry; another tab cannot force a reload.
5. The game is central on desktop and mobile: no large title above it, promotional microcopy or side column. Dialog scroll lock/unlock and physical keyboard arrows must pass browser checks.
6. Tests and production build pass; verify keyboard/touch, drawer, completion and both themes in a browser. Actual Samsung hardware testing remains a release gate, not something desktop emulation can certify.

## Phases
- **1 — this slice:** architecture, polished board, 200 curated samples, reliable session, offline app shell, tests and documented handoff.
- **2 — content + fairness:** Provenance audit of the bundled 200 quotes; solver, clue selection, ambiguity rejection and measured difficulty. See PUZZLE_ENGINE.md.
- **3 — Android refinement:** real-device gesture navigation, scale/accessibility/landscape tests, usability sessions, content revision and storage migration hardening.
- **4 — release:** installation guidance, offline/update QA, privacy statement and optional Android packaging only when explicitly requested.

## Release acceptance
Bundled history remains readable offline at `#/updates`; browser/Android Back restores play and scroll/focus. Package, lockfile, release history and release tag agree. CI tests/builds before producing a versioned archive. Hosting must refresh sw.js and HTML while retaining immutable hashed assets. See ../.agents/RELEASING.md.

## Languages
The bottom of the drawer has a native English / Русский selector. It switches the whole interface, accessibility labels, announcements, dates, release history, keyboard and original-language quote collection. Save the choice and last puzzle per language; preserve progress in both. Use device language only without a saved compatible preference. Russian hardware typing accepts Cyrillic directly or English physical positions; no hidden editable transport. All translations, original quotes and Cyrillic fonts ship offline.

Secondary destinations are full screens on phones and windows on desktop. Browser Back closes collection/help/settings/history opened from the drawer. Every language has exactly 100 unique puzzles. Added content appends within its language, preserving all preceding positions, IDs, revisions and progress.

## Approved quality pass — 0.4.0

- Historical 0.4.0 policy, superseded by 0.4.1 below: Easy must not depend on recognising the author/quotation or guessing rare literary vocabulary. Its reviewed starting clues allow a chain of deductions through short, familiar words. A developer-only word-pattern/bijection verifier uses independent frequency lists, never a quotation-answer corpus. Each step starts with at most two unknown symbols in an English word of ≤7 letters (Zipf ≥4.5) or a Russian word of ≤8 letters (Zipf ≥4.0; inflection splits frequency). At least two letter assignments remain for the player. Any rejected beginner candidate becomes Medium/Hard. Hard may use rarer vocabulary, poetic forms and contextual phrasing, as requested.
- Keep 100 quotes and their numbering per language. Answers, sources and seeded numeric mappings remain unchanged. Reviewed profiles classify all entries. Only the 40 expanded clue sets bump quote revision 1→2. Explicit migration adds new clues to current and historical snapshots, removes only assignments conflicting with those new givens, preserves other guesses/hints/completions, and removes history steps made redundant by the new givens. No full progress reset.
- Collection displays author, work, difficulty and New/In progress/Completed status. Difficulty and status filters combine; empty results offer a reset. Continue returns to the current started puzzle or the first started entry. Next skips completed entries in a stable shuffled order, balancing editorial difficulty, quote length and author variety with calmer stretches between challenges. It wraps when all are complete. No statistics dashboard.
- Settings offers a local JSON export/import for both languages, hints and undo/redo. Export snapshots memory, including the latest move, even when saving fails. Import validates the entire file before writing, previews add/replace/keep/unavailable counts, keeps local progress by default and requires explicit opt-in to replacement. One IndexedDB transaction commits the merged state and resume preferences before memory changes; failure leaves local progress intact. A 30-second cancellation prevents a stalled queued restore from applying later. On a fresh device restore the saved puzzle per language; an existing device retains its current puzzle, language and appearance. No upload, account or cloud dependency.
- Real-device interaction testing was reported acceptable by the user for this pass. Continue browser regression checks; do not claim that this report independently certifies every accessibility/device scenario.


## Difficulty adjustment — 0.4.1

The user prefers a more demanding game close to the original clue density, including vocabulary/contextual reasoning. Keep the 20/20 Easy selection and the reviewed labels, but restore original authored clue sets with only one additional earlier-reviewed anchor in Easy (where available). Medium/Hard clues are unchanged. The common-word solver is diagnostic, not a gate that may automatically reveal most of the quote.

The 40 previously expanded profiles move to quote revision 3 with explicit revision-1 and revision-2 clue metadata. On migration, remove withdrawn automatic givens from unfinished snapshots, preserve player guesses/hints/history and preserve completed snapshots in full. Newly started/restarted games use sparse clues; completed puzzles never become unsolved just because the app changes difficulty. Answers, IDs, numbering, numeric seeds and the database/session envelope remain unchanged.


## Invisible quality improvements — 0.5.0

- Developer-only content review searches bounded alternative word assignments and reports ambiguity/depth/coverage limits for manual inspection. No automatic clue expansion or content changes. See CONTENT_REVIEW.md. Default invocation samples two quotes, not the entire corpus.
- Next-puzzle rhythm uses a short effort curve rather than mandatory difficulty alternation: length adjusts editorial difficulty, author repetition gets a small penalty, stable shuffled order breaks close scores. Completed count chooses the phase, so reload needs no new preference or history schema. Missing levels fall back naturally to available unfinished content; completed entries are skipped and all-complete wraps. It is not adaptive profiling or telemetry.
- Saved progress uses optimistic transaction checks across tabs. Normal committed moves synchronize through optional BroadcastChannel notifications and refresh on visible return. Synchronization does not disturb selection/check marks if the current session did not change. True conflicts never overwrite the durable copy or silently discard unsaved local moves. Local play/export remain available; Settings offers explicitly confirmed replacement with saved progress. Backup restore uses the same atomic checks. Unresolved conflicts block PWA reload even if a later preferences write succeeds.
- IndexedDB schema 2 preserves existing records and closes schema-1 connections, preventing old-version writers from bypassing protection. Session envelope 1, preferences 2, quote revisions and portable backup format 1 remain compatible. Older application builds must update to write on this origin after upgrade.
