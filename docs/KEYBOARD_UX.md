# Keyboard decision — CODE first slice

Reviewed 19 October 2026 after the user questioned the custom keyboard and reported silent physical-key input on macOS.

## Decision
Keep the custom keyboard as the MVP default on phones. This is a task-specific decision for selecting a cipher symbol and entering exactly one English letter, not a claim that custom keyboards are generally better. Keep native physical-key input fully independent of the onscreen keyboard.

## Why it fits this game
- Input is an atomic A–Z substitution, not free text. Cursor navigation, predictive text, word replacement, voice dictation and word suggestions do not help this operation.
- The game knows the keyboard geometry and can reserve a stable quote scroller above it. Native IME height, floating/one-handed mode and viewport behavior vary; supporting them is possible but needs another layout path.
- A fixed English alphabet is available regardless of the phone's current language. Assigned letters can be shown neutrally and Enter can navigate empty occurrences. Accepted guesses also advance automatically to the next blank, regardless of correctness.
- One tap produces one guess. There is no accidental word correction or additional text to normalize. This is a design inference from the input contract, not an observed performance advantage from a user study.

## Where native wins
Native keyboards are familiar and come with mature touch handling, personal layout preferences, accessibility typing behavior, system haptics and user-selected one-handed/floating modes. A custom surface must implement and test its own labels, focus, hit targets, contrast, scale and TalkBack behavior. We have not measured whether this custom keyboard is faster or more comfortable on a Galaxy S26 Ultra.

Do not add a native/custom preference and two input architectures before a real-device comparison demonstrates a need. If TalkBack usability or thumb reach is worse in testing, revisit the decision and prototype native input with autocorrect/spellcheck/suggestions disabled and explicit quote visibility handling.

## Will the native Android keyboard open?
The gameplay cells and custom keys are HTML buttons, not text inputs or contenteditable elements. There is no invisible input used to collect hardware typing, and no code calls a keyboard-show API. Focusing a normal cell therefore should not request a soft keyboard. Cipher cells also declare inputmode="none" as a defensive intent, but it is not the basis of the architecture and must not be treated as a cross-browser guarantee.

Settings use only a select and checkbox, not a text editor. Re-check this invariant whenever search, notes, login, native typing or another editable field is added. A desktop browser can verify the DOM/focus contract, but only an Android device can verify that Samsung Keyboard/Gboard never open unexpectedly through the whole gameplay lifecycle.

## macOS repair
The previous router accepted event.key only when it was A–Z. In a Russian layout, a physical English H key can produce key="р" and code="KeyH", so that event was silently dropped. The new pure interpreter uses an ASCII Latin key when present (preserving AZERTY/QWERTZ/Dvorak semantics) and otherwise maps a non-Latin letter through code="KeyA"…"KeyZ". It also recognizes undo/redo in that layout. Composition/dead keys, Option combinations and unrelated Command shortcuts stay untouched.

There is now a single gameplay view, without Read/Solve tabs or a keyboard header. Text fields and open dialogs still receive their own input. Safari/macOS does not focus clicked buttons by default, so a cell click now explicitly focuses that actual occurrence. If a browser supplies a non-Latin character without a usable physical code, a visible English-layout/onscreen-key message replaces silence. No hidden editable input was introduced to solve a desktop issue.

## Evidence and sources
- [MDN: inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode): none is intended for pages that provide their own keyboard control; this is an input hint rather than validation or a global keyboard lock.
- [Android: handle input method visibility](https://developer.android.com/develop/ui/views/touch-and-input/keyboard-input/visibility): soft-input visibility follows focus/input context, and layout must account for the input method.
- [MDN: button focus behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#clicking_and_focus): Safari intentionally differs in whether mouse clicks focus buttons.
- [MDN: KeyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key): the generated character depends on keyboard layout and modifiers.
- [MDN: KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code): identifies physical key position; useful for game controls but must not replace meaningful Latin characters indiscriminately.

## Hardware acceptance gate
Test Android Chrome and installed PWA on the reference Samsung, with both Samsung Keyboard and Gboard configured, across cell taps, hints, drawer navigation, dialogs, completion/undo, rotations and background/resume. Verify no IME opens, the active cell remains visible and gesture navigation is unobstructed. Compare a native-input prototype only if the custom keyboard loses on one-handed reach or accessibility. Include TalkBack and Bluetooth typing. These hardware outcomes are not certified by desktop emulation.
