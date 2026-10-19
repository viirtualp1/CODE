# CODE — working agreement

These rules apply to the whole repository. Paths below are relative to the repository root. Keep agent rules, release instructions and handoff notes in .agents/; the root AGENTS.md is only a discovery pointer.

Read docs/PRODUCT.md, docs/DESIGN.md and docs/PUZZLE_ENGINE.md before changing behavior. Read .agents/HANDOFF.md for commands and the current implementation boundary. README.md is a short player-facing overview; keep developer instructions out of it.

## Priorities
1. Android interaction quality and accessibility.
2. Fair puzzles and trustworthy state.
3. Minimal, distinctive design.
4. Small, testable modules. Avoid speculative abstractions.

## Architecture
- Vue 3 Composition API + TypeScript; Pinia owns session state.
- src/engine: pure cipher and session operations, no Vue or storage imports.
- src/i18n: complete en/ru Vue I18n messages, including accessibility; no engine imports of Vue/i18n. Language selection sits at the drawer foot.
- src/data: bundled sample quotes with provenance and explicit clue letters.
- src/services: IndexedDB and preferences; storage failure must not stop play.
- src/components: presentation and user interaction; src/styles: SCSS tokens/layout.
- PWA caches bundled application assets only. No external API or account.
- Answers are shipped offline; this is a personal puzzle, not an anti-cheat system.

## Change rules
- Preserve one-to-one mappings, immutable clues, grouped symbol updates and explicit checking.
- Never infer incorrectness from a normal key press. Exact completion can celebrate automatically.
- Use an unframed game surface and floating menu button fixed at top:0/left:0, with safe-area padding inside its hit target and an animated modal left drawer. Show the noninteractive puzzle number and difficulty at the upper right, aligned with the burger; no header bar or divider. Collection position and full source details remain in the drawer. No Read/Solve switch or keyboard header.
- Portrait board size must use available space and rendered content, choosing the largest fitting tier; do not force all quotes into a tiny height-based mode. Keep selection and typing independent of fit.
- Phone gameplay has no document or quote scrolling: fit every bundled word, attribution and keyboard inside the dynamic viewport. Never hide overflowed puzzle content to fake a fit. Long dialogs/release notes still scroll internally.
- Gameplay stays visually central: no oversized headings, promotional labels, sidebar tips or marketing copy on the playing screen.
- Support spatial arrow navigation, a single board tab stop, and typed input into the focused cell.
- Every modal must lock body/document scrolling and restore styles, scroll position and focus on close.
- Keep punctuation and word boundaries; do not split a word across lines.
- Keyboard input must ignore editable controls, dialogs, composition and unrelated modifier shortcuts. Route input for the puzzle language: English preserves Latin-layout meaning with non-Latin physical-code fallback; Russian accepts А–Я/Ё directly and English physical keys via ЙЦУКЕН. Keep Е/Ё distinct.
- Explicitly focus clicked cells on Safari/macOS. Successful letter entry advances from that occurrence to the next blank in reading order, wrapping once. Rejected/unchanged input and ordinary erase retain selection. While explicit Check marks exist, erase focuses and clears one marked assignment, retaining other marks; never silently calculate correctness.
- Never add a hidden editable field for hardware typing: it risks opening Android IME. See docs/KEYBOARD_UX.md.
- Do not display routine Saved/Saving labels; show actual storage failures only.
- Keep keyboard and active symbol visible at narrow widths, landscape and enlarged text. Toolbar and keyboard share horizontal bounds at every size. Release notes keep at least 24px top/bottom gaps plus safe-area protection. Show a green dot beside Update available in the drawer only when an update is downloaded.
- Do not add telemetry, ads, payments, a quote API, statistics, native packaging, or a generator in this slice.
- Update docs when contracts, persistence schema or scope changes.
- Every release updates package.json, package-lock.json and the newest entry in src/data/releases.json together; run release:check. Follow .agents/RELEASING.md. Never auto-reload active play or discard writes to apply an update.
- Run npm test and npm run build before handing off; run browser checks for interaction/layout work.
- Test behavioral invariants and recovery paths; do not write tests that simply restate markup.
- No subagent requirement. No deployment is required for the local application deliverable.

## Handoff
Record current behavior, known limitations, validation and next steps in .agents/HANDOFF.md. Keep quotes' sources and reuse rationale attached to their data. Storage migrations require a version bump and explicit compatibility handling.
