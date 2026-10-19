# CODE — design and interaction specification

## Direction
Editorial restraint serves the game. Keep CODE branding inside the menu, strong typography, warm paper and fine rules; put the cipher in the center. No oversized title above the puzzle, promotional eyebrows, ambient slogans, progress dashboards or side columns on the playing screen. Help belongs behind its button. Every visible label must explain an action or the current puzzle state.

The first iteration's large headline and margin copy were removed following user feedback. This is an enduring product decision, not a temporary responsive workaround.

## Tokens and typography
- Light: paper #f5f3ed; surface #fcfbf7; ink #262924; secondary #62685d; line #dcdfd3; accent #5e6c40; selection #e4e9d8.
- Dark: paper #1d211e; surface #242924; ink #eeeee4; secondary #a5ad9e; line #3c443c; accent #b1c28c; selection #3a4730.
- Interface: bundled Manrope. Attribution, dialog titles and library authors: bundled Newsreader. No runtime font service.
- Main quote: clear sans-serif fixed glyph slots, 22–26px on phones and 32px on wide desktops; tabular number labels. Interface sizes use rem for device text scaling; cipher glyphs and keyboard key labels cap at their geometric slot size so words and keys remain usable. Browser zoom still scales the entire surface.
- Spacing base 4px, rhythm 8/12/16/24/32/40px. Corner radii 2–4px. Rules 1px. No game-surface shadows, gradients or decorative illustrations.
- Muted terracotta plus a dot marks mistakes only after requested checking. Selected cells use a light olive rectangle and stronger baseline. Revealed letters use olive; user guesses stay neutral.
- Motion: 140–200ms color/opacity; restrained 2px letter arrival. No spring effects or number movement. Reduced motion disables transitions.

## Layout
Primary reference: Samsung Galaxy S26 Ultra. Use CSS pixels, dynamic viewport and safe-area metrics; do not hardcode unverified hardware dimensions. QA at 360×800, 412×915, 480×960, 915×412 landscape and desktop; simulate 200% text and later verify on hardware.

Desktop: a floating hamburger at the upper left and one horizontally centered game column (maximum 1160px), starting near the top. No persistent rail, masthead or reserved header band. No landing-page content. The cipher is the largest visual object; metadata above, attribution below, editing actions at the foot. At 1100px+ desktop widths, use 40px cells and 32px letters rather than stretching a small mobile board; the custom keyboard expands to 720px directly underneath. Short laptop windows constrain and scroll the board while retaining the input deck. Keyboard instructions live in Help.

Portrait phone: the board begins 12px below the safe-area top. A fixed floating hamburger overlaps the upper-left metadata area with reserved horizontal space so it covers no information. No full-width header. The game fills the viewport. A separately scrollable quote region keeps toolbar and keyboard reachable. Short quotes sit vertically centered in the board; long quotes scroll from the top. Landscape places the board and input side by side and reduces chrome.

## Board and focus
Words are unbroken flex groups; spaces create wrapping opportunities. Each cell has a stable letter slot, bottom rule and number. Punctuation remains literal. The sample corpus caps word length at ten letters; later content needs a deliberate long-word policy.

Every matching symbol highlights. A single actual occurrence is the keyboard focus and board tab stop; other cells have tabindex -1. Clicking a repeated occurrence preserves that occurrence, rather than jumping to the first match. Selection and viewport resizing reveal the active occurrence inside the quote scroller. A short desktop window may scroll the document to keep physical-key focus visible.

## Keyboard contract
- A–Z: use the typed Latin character; a non-Latin physical layout falls back to English KeyA–KeyZ positions. Preserve Latin AZERTY/QWERTZ/Dvorak meaning. Explicitly focus clicked cells for Safari/macOS. If physical codes are missing, show layout guidance instead of dropping input silently. Set the selected symbol everywhere, then advance actual focus to the next empty occurrence after the chosen occurrence, wrapping once. No correctness signal. Rejected/unchanged input retains focus.
- Backspace/Delete: erase that assignment.
- Left/right: previous/next editable occurrence in reading order, skipping initial and hinted clues. Keep the boundary rather than wrapping to the opposite end.
- Up/down: nearest editable cell on the adjacent rendered row, based on actual geometry; responsive line wrapping is respected.
- Home/End: first/last editable occurrence in the quote.
- Ctrl/Command Z: undo; Shift Z or Ctrl/Command Y: redo. Undo/redo also works after completion.
- Tab: standard navigation between the board and controls. Dialogs and editable form fields consume their own input. Ignore IME composition and modified letter shortcuts.
- Custom Enter / physical Enter from a board cell: next empty occurrence, wrapping once, using the same pure helper as automatic advance. Enter on ordinary buttons retains normal activation. If no blanks remain, retain selection. Unlike arrows, this skips filled guesses.
- Three keyboard rows with no header, mode controls or selected-symbol caption. Erase is at the far right of row two, directly above Enter in row three. Key geometry stays stable across guesses.

## Modes, dialogs and feedback
There is one gameplay view. Completion replaces the keyboard with Next puzzle; undoing completion restores it. No Read/Solve state, timer, score or artificial success color during normal input. Erase retains selection.

Toolbar: undo, redo, restart, Hint, Check. Native accessible dialogs provide puzzle selection, settings, help and confirmed hint/restart actions. The left drawer uses the same native modal component, with a 220ms slide in and 200ms slide out; reduced motion dismisses immediately. Its menu items form separated blocks, and secondary pages open only after drawer cleanup. Opening any dialog locks body/document scrolling, preserves scrollbar width, and retains the underlying scroll offset. Closing restores styles, offset and focus. A long dialog scrolls internally. Escape, close button and backdrop dismissal all restore the same state.

Normal selection/entry announcements go to a polite screen-reader live region. Visible feedback is reserved for refused actions, requested check results and storage failures. Avoid repeating selected-number labels in several places. Do not show Saved/Saving status on the playing screen. Persist automatically; only a real save failure needs visible feedback.

## Acceptance
No horizontal overflow at reference widths. Whole words remain intact. Custom keyboard and active cell remain visible together. Ordinary controls aim for 44px targets; dense cipher cells and QWERTY keys follow Android keyboard geometry with 24px-class widths and 44–48px height. Visible keyboard focus, sufficient contrast, text scaling and reduced motion are required. Test light/dark, playing/completion, drawer open/close and submenu transitions, checked mistakes, long samples, narrow/landscape, all dialog close paths and physical-key navigation. Real Samsung gesture-navigation, TalkBack and font-scaling tests remain release gates.

## Input surface decision
Keep the custom keyboard for the single-letter MVP; do not introduce a hidden editable input for hardware typing. Cells are non-editable buttons with inputmode="none". The rationale, native/custom tradeoffs, primary sources and Android hardware acceptance gate are in KEYBOARD_UX.md. This is a product hypothesis, not proof of superior typing speed or certified Android IME behavior.


## Updates and release history
A 6px olive dot on the floating menu button signals a downloaded update without adding gameplay chrome. The drawer's What’s new row includes the installed version and, when relevant, Update available. Its `#/updates` page uses the shared scroll-locked modal: current edition and one update/check action above a chronological editorial list. Notes ship inside the cached app bundle. No automatic launch popup or interrupting gameplay banner.

During a requested update the action and modal dismissal are disabled; the underlying game is inert. Show the save/activation stage and a specific recoverable error. Do not reload after a failed save or timeout. Browser/Android Back closes the page except during the short update operation; directly opened release links close to the puzzle without navigating away from CODE. Reduced motion and enlarged text use the existing dialog rules.
