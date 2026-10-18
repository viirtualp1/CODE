# CODE — working agreement

Read docs/PRODUCT.md, docs/DESIGN.md and docs/PUZZLE_ENGINE.md before changing behavior. Read README.md for commands and the current implementation boundary.

## Priorities
1. Android interaction quality and accessibility.
2. Fair puzzles and trustworthy state.
3. Minimal, distinctive design.
4. Small, testable modules. Avoid speculative abstractions.

## Architecture
- Vue 3 Composition API + TypeScript; Pinia owns session state.
- src/engine: pure cipher and session operations, no Vue or storage imports.
- src/data: bundled sample quotes with provenance and explicit clue letters.
- src/services: IndexedDB and preferences; storage failure must not stop play.
- src/components: presentation and user interaction; src/styles: SCSS tokens/layout.
- PWA caches bundled application assets only. No external API or account.
- Answers are shipped offline; this is a personal puzzle, not an anti-cheat system.

## Change rules
- Preserve one-to-one mappings, immutable clues, grouped symbol updates and explicit checking.
- Never infer incorrectness from a normal key press. Exact completion can celebrate automatically.
- Gameplay stays visually central: no oversized headings, promotional labels, sidebar tips or marketing copy on the playing screen.
- Support spatial arrow navigation, a single board tab stop, and typed input into the focused cell.
- Every modal must lock body/document scrolling and restore styles, scroll position and focus on close.
- Keep punctuation and word boundaries; do not split a word across lines.
- Keyboard input must ignore editable controls, dialogs, composition and unrelated modifier shortcuts. Accept non-Latin hardware layouts through English physical codes, preserving Latin layout meaning.
- Explicitly focus clicked cells on Safari/macOS. Clicking/typing an editable cell in Read resumes Solve.
- Never add a hidden editable field for hardware typing: it risks opening Android IME. See docs/KEYBOARD_UX.md.
- Do not display routine Saved/Saving labels; show actual storage failures only.
- Keep keyboard and active symbol visible at narrow widths, landscape and enlarged text.
- Do not add telemetry, ads, payments, a quote API, statistics, native packaging, or a generator in this slice.
- Update docs when contracts, persistence schema or scope changes.
- Run npm test and npm run build before handing off; run browser checks for interaction/layout work.
- Test behavioral invariants and recovery paths; do not write tests that simply restate markup.
- No subagent requirement. No deployment is required for the local application deliverable.

## Handoff
Record current behavior, known limitations, validation and next steps in README.md. Keep quotes' sources and reuse rationale attached to their data. Storage migrations require a version bump and explicit compatibility handling.
