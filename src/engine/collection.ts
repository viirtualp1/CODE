import { isComplete } from './cipher'
import type { Puzzle, Session } from './cipher'
export type ProgressStatus = 'new' | 'started' | 'complete'
export function progressStatus(puzzle: Puzzle, session: Session): ProgressStatus {
  if (isComplete(puzzle, session)) return 'complete'
  return session.hints.length || session.undo.length || session.redo.length || Object.keys(session.entries).some(key => !puzzle.clues[Number(key)]) ? 'started' : 'new'
}
// Stable shuffled order avoids author/source batches without reshuffling after reload.
function orderKey(id: string): number {
  let value = 2166136261
  for (const letter of id) value = Math.imul(value ^ letter.charCodeAt(0), 16777619)
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  return value >>> 0
}
/** Relative editorial effort, not a calibrated human difficulty score. */
export function puzzleEffort(puzzle: Puzzle): number {
  const letters = puzzle.words.flat().filter(cell => cell.symbol).length
  const base = { Easy: .2, Medium: .5, Hard: .8 }[puzzle.quote.difficulty]
  return Math.max(0, Math.min(1, base + Math.max(-.12, Math.min(.16, (letters - 50) / 250))))
}
export function nextPuzzleId(puzzles: readonly Puzzle[], sessions: Record<string, Session>, currentId: string): string {
  if (!puzzles.length) throw new Error('Empty puzzle collection')
  const shuffled = [...puzzles].sort((a, b) => orderKey(a.quote.id) - orderKey(b.quote.id) || a.quote.id.localeCompare(b.quote.id, 'en'))
  const index = shuffled.findIndex(puzzle => puzzle.quote.id === currentId)
  const current = shuffled[index]
  const ordered = [...shuffled.slice(index + 1), ...shuffled.slice(0, Math.max(0, index))]
  const unfinished = ordered.filter(puzzle => !isComplete(puzzle, sessions[puzzle.quote.id]!))
  if (!unfinished.length) return (ordered[0] ?? current ?? shuffled[0])!.quote.id
  // A few calmer puzzles, a peak, then recovery. Counts survive reload without new state.
  const completed = puzzles.filter(puzzle => isComplete(puzzle, sessions[puzzle.quote.id]!)).length
  const rhythm = [.24, .32, .73, .42, .27, .65, .37]
  const target = rhythm[Math.max(0, completed - 1) % rhythm.length]!
  const ranked = unfinished.map((puzzle, position) => ({ puzzle,
    score: Math.abs(puzzleEffort(puzzle) - target) + (puzzle.quote.author === current?.quote.author ? .09 : 0) + position / Math.max(1, unfinished.length) * .06,
  })).sort((a, b) => a.score - b.score)
  return ranked[0]!.puzzle.quote.id
}
