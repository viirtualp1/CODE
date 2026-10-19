import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateRelease, releaseMarkdown } from './release.mjs'
const notes = [{ version: '0.2.0', date: '2026-10-19', title: 'Updates', changes: ['Safe updates.'] }, { version: '0.1.2', date: '2026-10-19', title: 'Keyboard', changes: ['Next blank.'] }]
test('release validation enforces a consistent package, lockfile and pushed tag', () => {
  assert.equal(validateRelease(notes, '0.2.0', '0.2.0', 'v0.2.0'), notes[0])
  assert.throws(() => validateRelease(notes, '0.2.0', '0.1.2'), /agree/)
  assert.throws(() => validateRelease(notes, '0.2.0', '0.2.0', 'v0.3.0'), /tag/)
})
test('release history rejects duplicates, wrong order, invalid dates and empty notes', () => {
  for (const catalog of [[], [notes[0], notes[0]], [...notes].reverse(), [{ ...notes[0], date:'2026-02-30' }], [{ ...notes[0], changes:[] }], [{ ...notes[0], version:'01.2.0' }]]) assert.throws(() => validateRelease(catalog, '0.2.0','0.2.0'))
})
test('release notes for GitHub use the same player-facing changes as the app', () => {
  const text = releaseMarkdown(notes[0])
  assert.match(text, /0.2.0/); assert.match(text, /- Safe updates./)
  assert.doesNotMatch(text, /Next blank/)
})
