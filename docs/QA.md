# Verification record — 19 October 2026

## Automated

- `npm test`: **44 passed**, 6 test files (Vitest 5.0.5), plus **3 passed** release-tool tests (node:test).
- `npm run build`: TypeScript check and Vite production build passed; PWA service worker and manifest generated.
- npm dependency audit after updating test tooling and replacing the deprecated icon package: **0 known vulnerabilities** at the time of installation.
- Production JavaScript approximately 110KB (42KB gzip); generated precache approximately 248KiB, with local fonts and icons.

Coverage includes deterministic bijective substitution for every sample, preservation of words/punctuation, clue validation, neutral incorrect guesses, grouped assignments, duplicate refusal, clue locks, erase, hint conflict displacement and undo, redo branching, bounded history, exact completion, unanswered selection, serial IndexedDB writes, snapshot-at-write behavior, corrupt record/history rejection, quote revision mismatch, storage failures, puzzle switching/resume, completion/undo and hint intent. Navigation tests cover horizontal ordering, skipping clues, vertical row geometry, boundaries, Home/End and fully revealed boards.

## Earlier browser interaction checks (0.1.0–0.1.1)

Performed on the actual local app through the in-app browser, not a static mockup:

- A wrong guess updated all three matching occurrences with **zero unsolicited mistake markers**. Requested Check marked those occurrences. Undo/redo cleared check feedback.
- Confirmed hint filled and locked the selected symbol; undo restored the previous guess and lock state. Keys typed while a dialog was open did not change the puzzle.
- Reading hid the keyboard without revealing unanswered cells.
- Completed an entire sample with physical-key input; exact completion and history survived a reload.
- Library filtering showed the correct Easy/Medium/Hard samples; switching preserved each puzzle.
- Physical desktop typing followed focused cells. Left/right moved editable occurrences, up/down followed rendered rows, Home/End moved to boundaries and Ctrl Z undid input. The board had exactly **one tabbable cell**.
- At a nonzero document offset (**229.5px**), a dialog applied body `position: fixed`, negative top and hidden overflow on body/document. Closing restored both prior style values and exactly **229.5px**. Internal dialog navigation did not move the background.
- Responsive checks at **360×800, 412×915, 480×960 and 915×412**: no horizontal document overflow; keyboard and active cell visible together. Landscape used side-by-side board/input.
- A QA harness with **32px root type (200%) at 412×915** had no horizontal overflow and retained the keyboard inside the viewport. Grid/key glyphs were capped to fit their slots; supporting type reflowed.
- Visually inspected final light and dark phone layouts and the centered 1440×1000 desktop layout. Large promotional headings, sidebar tips and filler labels have been removed per user feedback.

## Production offline check

Served the built output at a fresh localhost origin, loaded the app and made a guess. Stopped the production server entirely. The PWA reloaded successfully with its saved guess. Entered a new guess while the server remained stopped, waited for the saved indicator and reloaded again: the new assignment persisted and remained playable. This verifies cached app-shell/assets plus local progress without a responding origin server. It does not simulate Android install UI or every network transition.

## Deliberate limits and follow-up gates

- Actual Samsung Galaxy S26 Ultra hardware, Android gesture navigation, TalkBack, physical haptics, display zoom and install/update UI still require real-device testing.
- 200% text was simulated through rem scaling, not an Android system settings session.
- A two-version localhost upgrade passed (see 0.1.1 checks below). Android-installed update UX and interrupted-network upgrade cases still need release QA.
- Tests cover storage corruption and unavailable storage. Cross-tab synchronization, quota pressure on hardware and database upgrades beyond schema 1 remain later gates.
- Samples have hand-selected starting clues and editorial difficulty labels. No advanced solver, ambiguity certification or 100–200 quote collection has been implemented.
- No statistics, remote quote service, hosting deployment or Android packaging was added.

Final screenshots are supplied in outputs; the downloadable project includes the same source, documentation, lockfile and verified dist build. The QA text-scale harness lives in ignored work/ and is not part of the production build or source archive.

## Revision 0.1.1 — keyboard, desktop scale and reduced chrome

- Added six physical-key interpreter tests: Russian code fallback, Latin-layout preservation, Command/Control undo/redo, absent-code guidance, dead-key/Option/composition guards and navigation/deletion routing. All 27 tests and the production build passed.
- Before repair, normal native macOS English input worked; non-Latin event.key characters were not accepted by the old router. The user could not recall the active layout, so this is a supported explanation, not a claim about their exact OS state.
- Tested native macOS letter input, Command Z and Right with the real browser key wrapper, not just Playwright letter injection. Entry and undo worked, and the arrow moved to the next editable occurrence.
- A local-only event harness reproduced key="р", code="KeyH" and Russian-layout Command Z. The H assignment and undo passed through the real Vue app router. This was event simulation; the operating system input source was not changed.
- Clicking a cell explicitly took DOM focus. Clicking an editable cell in Read resumed Solve. Typing into a keyboard-focused cell in Read also resumed Solve and entered the letter. Modal input guards and body scroll restoration remained intact.
- Removed all routine saved/saving text from gameplay. Save errors still produce a visible notice.
- At 1440×1000, measured board width **1160px** and cipher type **32px** (previously 840px and 24px). At 1280×800 the board measured 1132px; keyboard and active cell stayed visible.
- Rechecked 360×800, 412×915, 480×960 and 915×412. No horizontal overflow; keyboard and active occurrence visible. The gameplay DOM contained **zero text editors**, with no hidden input/contenteditable transport. This supports the no-IME architecture but does not certify Android soft-keyboard behavior.
- Production update from cached 0.1.0 to 0.1.1: waited for the update prompt, entered an additional guess, applied Save & refresh and verified the new board scale, absence of saved text and retained guess.
- Stopped the production server again. The updated build reloaded offline, accepted a native key entry and retained it across another offline reload.
- The custom/native decision, tradeoffs and primary references are in KEYBOARD_UX.md. Actual Samsung/Gboard/Android accessibility comparisons remain outstanding hardware gates.

## Revision 0.1.2 — floating menu and continuous entry

- Removed the masthead, permanent rail, Read/Solve state, keyboard tabs, selected-number header and shortcut caption. A fixed floating hamburger opens a native-modal left drawer with CODE branding and block menu items. The board starts at **12px on phones**, and **24px at 1440×1000**, without a header band.
- Drawer slides in/out; Escape and close button restore body/document styles and focus to the hamburger. Drawer-to-collection transition leaves exactly one open dialog with body/document scroll locked. Existing modal scrollbar/scroll-offset restoration code is shared, rather than duplicated.
- Clicked a late repeated number 12 in the Wilde sample and entered A through the onscreen keyboard. Every matching occurrence filled, zero unsolicited mistake markers appeared, and actual DOM focus wrapped to index 3, the next blank in reading order. There remained exactly one board tab stop.
- Native macOS T was refused because it was already assigned to a clue; focus stayed at index 3. Native H then filled all six matching occurrences and advanced to index 4. Native Enter moved to the next blank. Incorrect guesses remain neutral; navigation never checks the solution.
- Verified completion replaces the keyboard with Next puzzle; Undo restores the keyboard and Redo restores completion. Starting selection now falls back to an editable symbol when a restored puzzle has no blanks, preserving board keyboard access.
- Checked **360×800, 412×915, 480×960, 915×412, 1280×800 and 1440×1000**: no horizontal page overflow, active cell and keyboard inside the viewport. Erase and Enter have identical horizontal bounds, with erase directly above Enter. Gameplay has no text editor or hidden editable input.
- At 200% root text and 412×915, no page overflow; keyboard bottom was 887px, and the drawer had no horizontal overflow. Visually inspected light and dark phone surfaces and the desktop layout.
- Updated cached production preview from 0.1.1 to 0.1.2 through Save & refresh; existing guesses survived. Production native O input updated the grouped assignment and moved focus to the next blank.
- After stopping the production origin server entirely, the updated build reloaded offline with its O assignment retained and the new menu present.
- Added tests for occurrence-based advance, repeated-symbol origin, punctuation/filled/clue skipping, wrap, fully assigned incorrect boards, Enter routing, and accepted/rejected/no-op edit reporting. All **32 tests** and the production build passed. No persistence schema change was required.

## Workspace relocation

The current 0.1.2 source was transferred to `/Users/virtualp1/Documents/personal/CODE` on 19 October 2026, preserving the existing Git repository and README introduction. All 32 tests and the production build passed from this directory. No gameplay changes were introduced during relocation.

## Revision 0.2.0 — release history and explicit PWA updates

- Added bundled release history, installed version, manual check/apply controls and What’s new in the drawer. Gameplay has no update banner; only a dot indicates a downloaded build. The `#/updates` page closes through browser Back/Escape/X and restores body/document styles and focus.
- Registration checks on return to a visible page, reconnection and every visible/online minute. The actual interval found the next build while the game remained open; the page did not reload automatically.
- Upgraded a cached 0.1.2 app to the first 0.2.0 build. Then served a second 0.2.0 preparation build with a different JS asset to exercise the new updater. These were local preparation builds, not two published releases.
- Entered C for number 17 immediately before the new updater test. A downloaded update appeared; the active JS stayed `index-cf_b_zPn.js` until Update & restart was clicked. After activation/reload it was `index-PwL0sr5m.js`, with C still assigned. Undo removed C and Redo restored it, verifying retained history as well as the latest move. No automatic mistake markers were introduced.
- Stopped the origin server entirely and reloaded `#/updates`: all four bundled release entries, theme and the C assignment loaded from the offline app. A manual check reported connection failure without claiming the app was current; the game remained available. This is an unavailable-origin test, not Android airplane-mode certification.
- Checked the release page at 360×800, 412×915, 915×412 and 1440×1000, in light/dark. No horizontal document/dialog overflow. At 200% text (32px root, 412×915), dialog scrollWidth equaled clientWidth (340px). After a long internal scroll, the sticky close button remained visible at top 40px, with a 44px target. Dev mode correctly reports checks unavailable.
- Added update tests for downloading/activation sequencing, missed events, superseding workers, worker failure, bounded waits, save-before-activation, duplicate requests, save rejection/stall, retries, messaging errors and cancellation/late events. Added release tests for package/lock/tag agreement, invalid history and identical app/GitHub notes. All **47 total tests** passed.
- Production build includes release validation. Tag validation passed for v0.2.0. Both GitHub workflows parse as valid YAML; they have not been pushed or run remotely. Vercel configuration is prepared from the Shotcaller reference, without a connected production project or deployment.
- Schema stays 1; quote IDs, revisions and saved gameplay format are unchanged. Release/check orchestration belongs outside the cipher engine. See ../.agents/RELEASING.md for preparing subsequent versions and cache policies.

Final 0.2.0 preparation build (`index-D-frUw_v.js`) also installed through the new updater with C retained; the sticky-header fix was present. The restarted preview returned `Cache-Control: no-store, max-age=0, must-revalidate` for `/sw.js`. Remaining release gates are remote CI, connecting the real production host and Samsung-installed PWA checks.

## Revision 0.2.1 — unframed, non-scrolling phone gameplay

- Removed the card surface/border, nested horizontal padding and complete top metadata strip (number, divider, difficulty and repeated collection count). Puzzle details remain in the drawer; Current puzzle also includes the full author/work/year.
- The transparent menu button has a measured 48×48px target at **x=0, y=0**. Safe-area padding is inside that target, not an outer offset. The quote has no mobile scroll handler; desktop focus reveal is retained.
- Tested all six bundled puzzles at **360×640, 360×800, 412×915, 480×960 and 915×412**. No document overflow, no scrollable gameplay descendants, every last word/attribution above the toolbar and every keyboard inside the viewport. These were content-bound checks, not merely hidden scrollbar checks. The already completed Austen sample retained its Next puzzle action.
- The longest Carroll sample also fit at **200% text**, 412×915 and 360×800. At 360×640 with 200% text and a refused E assignment, first quote row top was **53px**, attribution bottom **385px**, toolbar top **398px**, keyboard bottom **590px**; no scroll container existed. Short-phone work/year details are available in the menu instead of consuming quote height.
- Native macOS T input, spatial Down navigation and Command Z worked in the new layout. Document scrollY and quote scrollTop remained **0** after entry/navigation; the active cell stayed above the keyboard.
- Inspected light and dark unframed phone layouts. Long dialogs and release notes deliberately retain their own internal scrolling; the no-scroll contract applies to gameplay. Storage failure uses a short persistent alert beside the floating menu, without changing game height.
- Existing **44 Vitest tests plus 3 release-tool tests** passed; production build/release validation passed. Gameplay storage schema and quote IDs/revisions are unchanged. Real Samsung gesture/display/font-scaling verification remains a hardware gate.

The saved production preview was explicitly updated from 0.2.0 to 0.2.1 through What’s new. Its current menu showed v0.2.1 and `index-B1xhglSD.js`; no top metadata strip remained. Final mobile and 1440×1000 desktop screenshots show the unframed layout.


## Revision 0.2.2 — taller keyboard and quiet puzzle context

- At 412×915, measured key height **64.05px**, up from 48px, and keyboard top **664.86px**, approximately 68px higher. An extra bottom inset lifts the bottom edge to 873px. Portrait keys scale between 50 and 68px; landscape stays 44px.
- Added plain, noninteractive number/difficulty text at the upper right, aligned with the menu's 48px target. No header surface, divider, tab stop or click target. Storage failure takes priority over this optional metadata.
- Checked every bundled puzzle at **360×640, 360×800, 360×840, 412×915, 480×960 and 915×412**: no document overflow or scrollable gameplay descendants; complete quotes and keyboards remained visible. Austen was already completed and retained its Next puzzle state.
- Longest Carroll sample with 200% text and duplicate-input feedback fit at 360×640, 360×800, 360×840, 412×915 and 915×412. At 360×640: first row top **49px**, attribution bottom **359px**, toolbar top **368px**, keyboard bottom **582px**. This is simulated rem scaling, not a Samsung hardware test.
- Native macOS T input updated the grouped symbol and advanced actual focus; Down and Command Z worked. One board tab stop remained; no unsolicited mistake marker or page scroll appeared.
- No engine, quote or persistence-schema changes.
- Existing **44 Vitest tests plus 3 release-tool tests** passed; release validation, TypeScript and production build passed. Visually checked light/dark at 412×915 and measured 60px desktop keys at 1440×1000.
- Cached production preview updated from 0.2.1 to **0.2.2** through What’s new → Update & restart; the installed version and new keys were verified after reload. Closing the drawer restored normal body positioning.


## Revision 0.2.3 — expanded collection and input refinements

- Appended ten sourced public-domain English excerpts (007–016); original six IDs, revisions, clue sets and seeds are unchanged. Collection now has 6 Easy, 6 Medium and 4 Hard editorial labels. See CONTENT.md for source passages and excerpt boundaries.
- Corpus tests now validate unique IDs/text and solve every sample through the real edit operation, in addition to deterministic mappings, clues, punctuation and maximum ten-letter words. All **55 Vitest tests plus 3 release-tool tests** passed.
- All ten additions fit intact at **360×640, 360×800, 412×915, 480×960 and 915×412** (50 checks), with no document overflow and attribution above the toolbar. All ten also fit at 200% root text at 360×640 and 412×915 (20 checks). These are browser emulations; hardware gates remain.
- At 412×915, key width is **38.59px**, up from 35.2px, with 4px screen gutters and 2px horizontal gaps. Existing 64px height is retained. Clicked H in puzzle 016: assignment entered, actual focus advanced, one board tab stop remained, Command Z undid the move and page scroll remained zero.
- Toolbar and keyboard bounds match at 360×640, 412×915, 915×412, 1280×800 and 1440×1000. At 915×412 both are **x=137.5–777.5**; at 1440×1000 both are **x=320–1120**. Erase remains above Enter.
- Release dialog measured **24px top/bottom gaps** at 360×640, 412×915, 915×412 and 1440×1000, with internal vertical scrolling, no horizontal overflow and body scroll locked.
- Confirmed all difficulty filters show the correct counts (6/6/4). Production build, TypeScript and release validation passed.
- Exercised a real update from cached 0.2.2 to a temporary local 0.2.3 preparation bundle, then the final 0.2.3 bundle. Before a download, no drawer dot existed. After the final bundle downloaded, the drawer showed the **8px green dot and Update available**; no automatic reload occurred. After explicit installation the dot disappeared. This was a local two-build check, not two published versions.
- Entered O in the new Shelley puzzle immediately before installing: all three O occurrences survived the update, and Undo remained available. Final loaded script was index-CRJvgKPL.js.
- In final release notes at 412×915, an internal scroll of 1579px retained the dialog top at **24px**, close target top at **44px**, and page scroll at **0**. Closing restored body styles. Screenshots record the availability badge, contained landscape actions and spaced release window.


## Revision 0.2.4 — portrait board uses available space

- Replaced the blanket small portrait board with a bounded largest-fit pass in CipherBoard. It measures actual word wrapping, quote-region padding, attribution and completion status; fixed cell slots prevent ordinary guesses from changing size. A ResizeObserver watches the region/attribution rather than the board, avoiding a self-observing resize loop. Landscape and desktop keep their existing CSS geometry.
- At 412×915, playing quotes choose **25–32px** letters (formerly 22px). At 384×824 they choose **25–32px** rather than the compact 20px cap. Larger slots and number labels accompany the larger letters. The longest Carroll sample uses 25px; shorter Brontë/Dickens samples use 32px. These are measured browser viewports, not a claim about the actual S26 Ultra browser configuration.
- Tested all 16 puzzles at **360×640, 360×800, 384×824, 412×915, 480×960 and 915×412** (96 checks). No document overflow; all words/attributions above actions, keyboard or completion action visible, first portrait row below the floating controls.
- Tested all 16 at **200% root text** at 360×640, 384×824 and 412×915 (48 checks), all fitting. With refused E input on the longest sample at 360×640/200%, the minimum fallback retained row top 49px, attribution bottom 359px, toolbar top 368px, keyboard bottom 582px and zero page scroll.
- Native macOS T input, Down navigation and Command Z worked after reflow. Focus moved from occurrence 3 to occurrence 12 on Down, while the chosen regular size stayed stable. Visually checked light/dark portrait layouts.
- All **55 Vitest plus 3 release-tool tests** passed; TypeScript, release validation and production build passed. No cipher, quote revision, keyboard geometry or storage schema changes. Real Samsung display/gesture/font settings remain hardware gates.
- Explicit production PWA update from cached 0.2.3 to 0.2.4 loaded index-i-ExlDHs.js with the current Shelley puzzle retained. Portrait measured 28px after reload, landscape reverted to its existing 19px type, desktop to 32px, and returning to portrait restored 28px.
