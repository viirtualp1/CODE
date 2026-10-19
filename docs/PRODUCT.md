# CODE — product specification

## Promise
A quiet, premium English cryptogram game for Android. Solve a sentence by finding the letter behind each number. No ads, subscription, currencies, paid features, account, network dependency or timer pressure.

## First vertical slice
A complete local session: six public-domain sample passages, Easy/Medium/Hard labels with hand-authored clues, consistent substitution, custom keyboard, physical keyboard, selection, grouped entry, erase, undo/redo, optional checking, a confirmed hint, completion, puzzle selection and reset. Resume each puzzle through IndexedDB. Include a floating menu button with an animated left drawer, light/dark/system preference and optional haptics. App shell installability and offline caching through a PWA. No statistics, advanced generator, remote quote service or Android wrapper.

Difficulty labels in this slice describe author-selected samples; they are not solver-certified. There is no scheduled daily service in this slice. Puzzle numbers are stable collection positions. All answers ship with the application.

## Session contract
- Every A–Z plaintext letter has one distinct numeric symbol in 1–26; punctuation and spaces are literal. Mapping remains stable across reloads.
- Selecting an editable cell selects its symbol and highlights every occurrence. Accepted letter entry moves actual focus to the next empty occurrence to the right in reading order, skipping filled symbols, clues and punctuation, and wrapping once at the end. Enter performs the same navigation. A rejected or unchanged entry and erase retain selection. If all symbols are filled, keep selection; correctness never determines where to move.
- Enter A–Z or erase globally for that symbol. A letter already used by another symbol is refused with a neutral explanation; this enforces the bijection without judging correctness. Initial clues and hint letters are locked.
- Guesses look neutral. Check is explicit and marks incorrect *current assignments*. Any edit, undo or redo clears the check result. Correct guesses receive no unsolicited green feedback.
- Undo/redo operates on one whole mapping edit, including a hint; new edits invalidate redo. Clues are never undoable. A hint confirms before revealing the selected editable symbol (including an existing guess), or the first unanswered editable symbol when selection is unavailable. A hinted symbol is locked until that hint is undone. No hint counters or penalties.
- Completion requires all substitutions to match the solution. Celebrate subtly, replace the keyboard with Next puzzle, expose the full readable quote and attribution, and retain undo/restart/library controls. Undoing completion brings back the keyboard.
- Restart requires confirmation and resets that puzzle's saved progress. Switching puzzles preserves each session. No destructive actions on opening a dialog.

## Recovery and accessibility
- No selected symbol: keys disabled, descriptive prompt visible. Selecting a clue may explain it without accepting input.
- Non-Latin physical layouts use English QWERTY key positions, while Latin layout characters retain their meaning. Missing physical codes produce visible guidance. Cell clicks explicitly take focus on Safari/macOS.
- Game cells/custom keys remain buttons, with no hidden text input or contenteditable transport. Native IME must not be requested during gameplay. A failed save still shows a warning; routine saving gets no label.
- Arrow keys navigate editable occurrences: left/right follow reading order, up/down choose the nearest cell on the adjacent visual row. Home/End select the first/last editable cell; boundaries do not wrap. Use one roving board tab stop. Letter input auto-advances; arrow navigation can revisit filled guesses for replacement.
- A floating upper-left hamburger opens an animated modal left drawer with CODE branding, current puzzle, collection, help, settings and appearance. No persistent masthead, rail, card or repeated puzzle metadata; the menu target is fixed at top:0/left:0. Puzzle details and collection position live in the drawer. The keyboard has no mode tabs or selected-symbol header; erase sits directly above Enter on the right.
- Modals lock body and document scroll, preserve scrollbar spacing and restore the exact scroll position, prior inline styles and opening control focus on close. Modal contents remain scrollable.
- Ignore physical keys while a dialog is open or focus is in a text field; support Backspace/Delete, Escape and normal undo/redo shortcuts.
- Refresh retains assignments, hints, undo/redo and the last puzzle. Selection may reset safely. Validate persisted data against current quote IDs, mappings, clue locks and schema. Corrupt/incompatible records are discarded without crashing. Write failure shows a persistent in-app notice; play continues in memory.
- Announce selection, refused duplicates, hint/check/completion and save failure through a polite live region. Do not announce every matching cell separately.
- Keyboard-operable controls, visible focus, accessible names, 44px minimum control targets (48px preferred); dense cipher cells and QWERTY keys use 24px+ widths with gaps and 44–48px height, contrast at WCAG AA, reduced motion, no reliance on color alone. System font scaling must reflow without clipped text.

## Acceptance gates
1. Every sample fits intact at 360×640, 360×800, 412×915, 480×960 and 915×412: no horizontal or vertical document/quote scrolling, no clipped words, keyboard and selected cells visible. Short phone layouts retain the author and move work/year to the drawer. Long dialogs may scroll internally.
2. Repeated symbols update together; wrong input stays neutral until Check; duplicate assignments cannot violate bijection.
3. Undo, redo, hint undo, reload, puzzle switching, restart and completion preserve the session contract.
4. Built PWA works offline after the first successful online load. Check quietly on visible return, reconnection and every visible minute. Only a dot on the menu advertises availability during play. What’s new contains version/history/manual check/apply. Apply freezes input, flushes pending writes, waits for actual activation and then reloads once. A failure retains progress and permits retry; another tab cannot force a reload.
5. The game is central on desktop and mobile: no large title above it, promotional microcopy or side column. Dialog scroll lock/unlock and physical keyboard arrows must pass browser checks.
6. Tests and production build pass; verify keyboard/touch, drawer, completion and both themes in a browser. Actual Samsung hardware testing remains a release gate, not something desktop emulation can certify.

## Phases
- **1 — this slice:** architecture, polished board, six curated samples, reliable session, offline app shell, tests and documented handoff.
- **2 — content + fairness:** 100–200 curated legally reusable quotes; provenance audit, solver, clue selection, ambiguity rejection and measured difficulty. See PUZZLE_ENGINE.md.
- **3 — Android refinement:** real-device gesture navigation, scale/accessibility/landscape tests, usability sessions, content revision and storage migration hardening.
- **4 — release:** installation guidance, offline/update QA, privacy statement and optional Android packaging only when explicitly requested.

## Release acceptance
Bundled history remains readable offline at `#/updates`; browser/Android Back restores play and scroll/focus. Package, lockfile, release history and release tag agree. CI tests/builds before producing a versioned archive. Hosting must refresh sw.js and HTML while retaining immutable hashed assets. See ../RELEASING.md.
