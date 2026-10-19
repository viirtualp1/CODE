# CODE

A functional, local-first cryptogram game built with Vue 3, TypeScript, Vite, Pinia, SCSS and IndexedDB

Current revision: 0.2.0.

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

1. Read AGENTS.md and docs/PRODUCT.md, docs/DESIGN.md, docs/PUZZLE_ENGINE.md.
2. Run npm test and npm run build.
3. Keep the current boundary: no advanced generator, remote quote API, statistics or Android packaging.
4. The next content phase needs audited provenance, a licensed word list, an ambiguity-aware solver and measured difficulty. The current six samples have editorial difficulty labels, not solver-certified fairness.

## Working behavior

- Six bundled original English excerpts with sources, reuse notes and hand-selected starting clues.
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

There is one screen, so no router is needed. No database wrapper, NLP library or generic command framework is needed. Native dialog provides focus trapping and inert background. Only a clicked/focused occurrence owns keyboard focus; every occurrence still shares its assignment. Arrows skip revealed clues but allow revisiting guessed cells. The app advances only successful regular letter edits, using the pure `nextEmptyCell` helper. It scans occurrences after the actual selected index, rather than the first appearance of that symbol. The board owns actual DOM focus and scroll visibility. Enter uses the same helper; arrows can revisit filled guesses.

History snapshots include both guesses and hint locks, capped at 100 steps. New edits clear redo. A hint may displace a conflicting guessed assignment; one undo restores both. Structural duplicate-letter rejection is not a correctness check.

IndexedDB database `code-cryptogram`, schema 1, store `records`: puzzle:<id> → {version:1, revision, session}; preferences → theme/haptics/currentId. Initial clues derive from source data, never storage. Selection, current occurrence, visible check marks, and dialogs are ephemeral; completion replaces the keyboard with Next puzzle. Undoing completion restores the keyboard. There is no view-mode state. When no blanks remain, initial selection falls back to an editable symbol so filled guesses remain keyboard-accessible. All writes serialize. Multiple browser tabs use last-writer-wins; cross-tab synchronization is outside this slice. Storage is per browser/origin, so changing host or preview port starts a separate local profile.

## Visual direction

Warm paper, near-black ink, olive selection, precise rules and restrained typography. The user explicitly requested a game-centered layout: put CODE branding and navigation inside a sliding left drawer, reached through a floating upper-left hamburger. The board starts near the top with no reserved header band. Remove large titles, slogans, marketing eyebrows, sidebar advice and filler labels from gameplay. Keyboard explanations live in Help. The keyboard has no header, Read/Solve controls or selected-number caption; erase sits directly above Enter on the right. Wide desktops use a 1160px board, 40px cells and 32px letters. Routine saved/saving labels are removed; failure warnings remain. See docs/KEYBOARD_UX.md for the custom/native decision and Android IME safety contract.

## Validation and limits

See docs/QA.md for recorded automated and browser checks. Desktop browser emulation does not certify Samsung hardware, TalkBack, Android haptics, gesture navigation or installation behavior. Difficulty is editorial for now. No promise of a unique language solution has been made for these samples; solver certification is phase 2. Source provenance and font/icon licenses are in docs/CONTENT.md and docs/THIRD_PARTY.md.


## Releases and PWA updates

See [RELEASING.md](RELEASING.md) for the release checklist, cache headers and hosting requirements. `npm run release:check` validates package/lockfile/history agreement; every production build runs it. `npm run release:notes` generates the GitHub release description from the same bundled data.

CI runs tests and a production build on branches and pull requests. A pushed `vX.Y.Z` tag runs them again, verifies the exact version and creates a GitHub release with a web archive and SHA-256 checksum. No release or deployment is triggered by editing local files. The current hosting configuration targets Vercel, matching the Shotcaller reference; connect the repository in Vercel before publishing. The GitHub release archive alone does not update the hosted PWA.

Release notes use `#/updates`, with browser/Android Back returning to the puzzle. Opening them directly and reloading works offline. There is no quote API, account or release API dependency. A downloaded version only activates after explicit Update & restart. During flush/activation the modal cannot be dismissed and gameplay is inert. Save and worker waits are each capped at 30 seconds and can be retried. Another tab's activation never forces this tab to reload. IndexedDB schema remains 1.

Local validation: 44 Vitest tests plus 3 release-tool tests, production build and browser checks (recorded in docs/QA.md). Remote GitHub Actions and hosted Android updates require the workflows to be pushed and the host connected; these have not run from this local session.
