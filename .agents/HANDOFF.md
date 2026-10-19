# CODE — developer handoff

A functional, local-first cryptogram game built with Vue 3, TypeScript, Vite, Pinia, SCSS and IndexedDB

Current revision: 0.3.0.

Working directory: `/Users/virtualp1/Documents/personal/CODE`. All subsequent changes belong here.

## Run

Use Node 24 (tested with 24.18.0) and the committed lockfile.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the local address printed by Vite. Production preview is needed to test service workers; development intentionally does not install one. PWA installation requires HTTPS or localhost and one successful online load. Do not open dist/index.html through file://. The current build targets the origin root; subpath hosting needs matching Vite base and manifest changes.

## Start here in a later session

1. Read .agents/AGENTS.md and docs/PRODUCT.md, docs/DESIGN.md, docs/PUZZLE_ENGINE.md.
2. Run npm test and npm run build.
3. Keep the current boundary: no advanced generator, remote quote API, statistics or Android packaging.
4. The next content phase needs audited provenance, a licensed word list, an ambiguity-aware solver and measured difficulty. The current twenty-eight samples have editorial difficulty labels, not solver-certified fairness.

## Working behavior

- Sixteen bundled original English excerpts and twelve original Russian excerpts with sources, reuse notes and hand-selected starting clues.
- Deterministic per-puzzle substitution and one-to-one assignments. Repeated symbols update together.
- Neutral guesses; explicit Check; confirmed, undoable hints; undo/redo; erase and Enter.
- Exact completion, puzzle switching, confirmed restart and per-puzzle resume.
- Single gameplay view, floating hamburger and animated modal left drawer; light/dark/system and optional supported-device haptics.
- Custom QWERTY and physical keyboard, including non-Latin layout fallback and explicit Safari/macOS click focus. Arrows follow editable cells and rendered rows; Home/End select first/last; Backspace/Delete erase; Ctrl/Command Z and Shift Z undo/redo. One board tab stop. Successful letter input advances to the next blank after the focused occurrence, wrapping once; Enter does the same. Erase/rejected/unchanged input keeps selection.
- Modal focus management, body/document scroll locking, internal modal scrolling and exact scroll restoration.
- IndexedDB failure leaves play available with a visible warning. Corrupt records are validated and reset safely.
- Bundled fonts/icons and generated service worker support offline play after initial caching. Updates are checked on return, reconnection and every visible minute; the player chooses when to install. Menu → What’s new contains the installed version, offline release history and manual update controls. A save failure blocks the reload; activation failure unlocks the page for retry.

## Architecture and decisions

| Area | Responsibility |
| --- | --- |
| src/engine/cipher.ts | Pure puzzle encoding, validation, assignments, checks, hints, snapshots, bounded history and completion |
| src/data/puzzles.ts | Small curated corpus, explicit clues, rationale, provenance and quote revision |
| src/interaction | Pure spatial navigation and physical-key interpretation, independent of Vue and DOM |
| src/stores/game.ts | Pinia session orchestration, selection, feedback, preferences, persistence lifecycle |
| src/services/update.ts | Bounded service-worker activation and save-before-reload orchestration |
| src/composables/useAppUpdate.ts | Registration, quiet checks, lifecycle cleanup and reactive update status |
| src/data/releases.json | Versioned, bundled player-facing release history; newest entry matches package version |
| src/services/storage.ts | Native IndexedDB, versioned envelopes, serial writes, validation and write flush |
| src/components | Board/focus/scroll, custom keyboard and shared native dialog with scroll lock |
| src/styles | Shared light/dark tokens and responsive game layout |
| src/App.vue | App chrome, composed gameplay, dialogs and physical-key routing |
| vite.config.ts | Build, tests and prompt-based PWA updates |

There is one screen, so no router is needed. No database wrapper, NLP library or generic command framework is needed. Native dialog provides focus trapping and inert background. Only a clicked/focused occurrence owns keyboard focus; every occurrence still shares its assignment. Arrows skip revealed clues but allow revisiting guessed cells. The app advances only successful regular letter edits, using the pure `nextEmptyCell` helper. It scans occurrences after the actual selected index, rather than the first appearance of that symbol. The board owns actual DOM focus. Phone layout displays the whole quote; only desktop overflow uses focus-reveal scrolling. Enter uses the same helper; arrows can revisit filled guesses.

History snapshots include both guesses and hint locks, capped at 100 steps. New edits clear redo. A hint may displace a conflicting guessed assignment; one undo restores both. Structural duplicate-letter rejection is not a correctness check.

IndexedDB database `code-cryptogram`, schema 1, store `records`: puzzle:<id> → {version:1, revision, session}; preferences v2 → theme/haptics/currentId/language/lastPuzzle per language. Unversioned preferences migrate by their valid current puzzle; unsupported versions are ignored. Database and session envelopes remain version 1. Initial clues derive from source data, never storage. Selection, current occurrence, visible check marks, and dialogs are ephemeral; completion replaces the keyboard with Next puzzle. Undoing completion restores the keyboard. There is no view-mode state. When no blanks remain, initial selection falls back to an editable symbol so filled guesses remain keyboard-accessible. All writes serialize. Multiple browser tabs use last-writer-wins; cross-tab synchronization is outside this slice. Storage is per browser/origin, so changing host or preview port starts a separate local profile.

## Visual direction

Warm paper, near-black ink, olive selection, precise rules and restrained typography. The user explicitly requested a game-centered layout: put CODE branding and navigation inside a sliding left drawer, reached through a floating upper-left hamburger. The board has no card/frame or top metadata strip. The burger is fixed at top:0/left:0, with safe-area padding inside its hit target. Phone gameplay fills 100dvh without document or quote scrolling. Static puzzle number and difficulty sit at the upper right, aligned with the burger. Collection position and full source details live in the drawer. Remove large titles, slogans, marketing eyebrows, sidebar advice and filler labels from gameplay. Keyboard explanations live in Help. The keyboard has no header, Read/Solve controls or selected-number caption; erase sits directly above Enter on the right. Wide desktops use a 1160px board, 40px cells and 32px letters. Routine saved/saving labels are removed; failure warnings remain. See docs/KEYBOARD_UX.md for the custom/native decision and Android IME safety contract.

## Validation and limits

See docs/QA.md for recorded automated and browser checks. Desktop browser emulation does not certify Samsung hardware, TalkBack, Android haptics, gesture navigation or installation behavior. Difficulty is editorial for now. No promise of a unique language solution has been made for these samples; solver certification is phase 2. Source provenance and font/icon licenses are in docs/CONTENT.md and docs/THIRD_PARTY.md.


## Releases and PWA updates

See [RELEASING.md](RELEASING.md) for the release checklist, cache headers and hosting requirements. `npm run release:check` validates package/lockfile/history agreement; every production build runs it. `npm run release:notes` generates the GitHub release description from the same bundled data.

CI runs tests and a production build on branches and pull requests. A pushed `vX.Y.Z` tag runs them again, verifies the exact version and creates a GitHub release with a web archive and SHA-256 checksum. No release or deployment is triggered by editing local files. The current hosting configuration targets Vercel, matching the Shotcaller reference; connect the repository in Vercel before publishing. The GitHub release archive alone does not update the hosted PWA.

Release notes use `#/updates`, with browser/Android Back returning to the puzzle. Opening them directly and reloading works offline. There is no quote API, account or release API dependency. A downloaded version only activates after explicit Update & restart. During flush/activation the modal cannot be dismissed and gameplay is inert. Save and worker waits are each capped at 30 seconds and can be retried. Another tab's activation never forces this tab to reload. IndexedDB schema remains 1.

Local validation: 79 Vitest tests plus 3 release-tool tests, production build and browser checks (recorded in docs/QA.md). Remote GitHub Actions and hosted Android updates require the workflows to be pushed and the host connected; these have not run from this local session.


## Phone layout contract — 0.2.4

The game is unframed, with 12px horizontal phone gutters. Small, noninteractive puzzle number and difficulty text share the burger’s vertical alignment at the upper right. There is no header bar, divider or duplicate collection counter. The transparent 48px menu target is fixed at the viewport origin; safe-area padding protects its icon without offsetting the target. Toolbar and custom keyboard stay in flow inside 100dvh. Neither the page nor quote is scrollable on phone layouts; long dialogs remain internally scrollable.

Portrait keys use 50–68px height (about 64px at 412×915), with an additional 8–16px bottom inset above the safe area. Portrait board fitting tries larger 32/28/25/22px letter tiers against the rendered words and remaining quote area, with the existing compact CSS as a minimum fallback. Thus a short quote can stay large even below 860px. The short-height rules remain the baseline, rather than the final size of every puzzle. Landscape retains 44px keys. Only the author's name remains under the quote at that size; full work/year details are always available in Current puzzle. Landscape uses the page width above a centered keyboard, rather than a narrow side-by-side card. A real save failure replaces the optional top-right metadata beside the burger in the control area; it does not push the keyboard below the viewport. Feedback grows only as needed, with readable bounded phone type.

Validated every bundled puzzle at 360×640, 360×800, 412×915, 480×960 and 915×412 without scrollable gameplay containers or hidden words. The longest sample also fits with 200% text at 412×915, 360×800 and 360×640, including duplicate-input feedback. Arbitrarily small windows, future longer quotes and real Samsung display/font scaling require their own fit validation before release; do not silently crop or shrink controls below their accepted bounds.


## Content and keyboard revision — 0.2.3

The collection contains 16 puzzles: 6 Easy, 6 Medium, 4 Hard (editorial labels). Ten additions are appended after the original six, preserving their IDs, quote revisions, cipher seeds and collection positions; existing IndexedDB schema 1 progress needs no migration. New IDs start at revision 1. Each quote has a verified source passage and individually selected clue rationale; see docs/CONTENT.md. No generator or API was introduced.

Portrait keyboard horizontal gaps are 2px, with 4px effective screen gutters when there are no larger safe-area insets. Only the keyboard extends 8px beyond each side of the 12px content gutters; the board spacing is unchanged. At 412px wide, key width increases from 35.2px to 38.6px. Desktop keyboard maximum width is 800px; landscape maximum is 640px. Erase and Enter remain vertically aligned at the right.

The action toolbar shares the keyboard's horizontal bounds via the same width constraint at all breakpoints. What’s new in the drawer displays an 8px green dot alongside its availability text only when an update is ready. The release dialog keeps at least 24px above/below it, respecting larger safe areas; its contents scroll internally and its close control stays visible.


## Portrait board sizing — 0.2.4

CipherBoard owns a small DOM-based fit pass for portrait viewports up to 700px wide. It tries five bounded data-size tiers, largest first, and measures the real wrapping against quote-region content width/height after padding, attribution and completion status. It uses fixed cell slots and does not examine guesses or answer correctness. At 412×915 the bundled playing quotes use 25–32px letters, replacing the former 22px cap; short quotes can use 32px even at 384×824.

A ResizeObserver watches the quote region and attribution, not the board itself, so changing tiers cannot create a resize feedback loop. Refit on content/viewport/attribution changes, then use existing focus navigation. No editor, persistent scale preference, general layout engine or resize animation is introduced. Landscape/desktop retain their CSS layout, and keyboard geometry is unchanged. Future content still needs explicit fit QA; minimum-size overflow must never be hidden.


## Agent documentation

Agent-only instructions live in .agents/: AGENTS.md contains repository-wide rules, HANDOFF.md contains commands/architecture/current behavior, and RELEASING.md contains release procedures. The root AGENTS.md is a short entry pointer. Product/design/engine specifications, provenance, licenses and QA records remain in docs/. Keep README.md focused on the game.


## Localization and checked erase — 0.3.0

Vue I18n in src/i18n owns complete en/ru UI messages, accessibility, announcements and dates; all historical release entries have ru translations. Locale defaults to the device language only when no compatible saved choice exists. The native selector sits at the drawer foot and changes UI, filtered quote collection, numbering and keyboard together. English has 16 puzzles, Russian 12; both remain cached offline. Each collection resumes its own last puzzle; switching never clears sessions.

Pure engine/alphabet.ts defines English 26-letter and Russian 33-letter alphabets, with distinct Е/Ё. Russian records have locale:ru; absent locale means legacy English. Existing English IDs/revisions/seeds/mappings remain unchanged, covered by the v0.2.4 golden fixture. Input failures are machine reason keys plus parameters; only the store/UI translates them. validSnapshot validates against the puzzle alphabet. The Russian keyboard has 12 columns and all 33 letters, including a dedicated Ё; erase remains above Enter. Hardware Cyrillic letters are accepted directly and English positions map to ЙЦУКЕН, including punctuation keys/Backquote for Ё. Shortcut guards stay language-independent.

Preferences writes use version:2 with language and lastPuzzle:{en?,ru?}; initialization explicitly accepts/migrates unversioned legacy records and ignores unsupported versions. Database/store/session record formats remain unchanged (schema/envelope 1), requiring no object-store upgrade. Do not bump English quote revisions for this localization. Serial writes still protect rapid language/puzzle switches.

Check marks are ephemeral explicit verdicts. Ordinary edits, hints, undo/redo and puzzle/language switches clear them. Erase is the exception while marks remain: pure nextCheckedCell selects the active marked occurrence or the next marked occurrence in reading order (one wrap), without inspecting answers. The board focuses/clears one grouped assignment via eraseChecked; only that mark is removed. Other marks remain for repeated erasing. Normal erase never judges correctness or moves focus. Each deletion is one undo step; undo clears check marks. Screen and physical Backspace/Delete use the same controller, even if a clue is selected.

Manrope Cyrillic and Noto Serif Cyrillic regular/italic are bundled; English Newsreader remains. Document language/title/description switch with locale; install name CODE is language-neutral. Read docs/CONTENT.md and THIRD_PARTY.md for sources and font licenses.
