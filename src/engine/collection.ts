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
export function nextPuzzleId(puzzles: readonly Puzzle[], sessions: Record<string, Session>, currentId: string): string {
  const shuffled = [...puzzles].sort((a, b) => orderKey(a.quote.id) - orderKey(b.quote.id) || a.quote.id.localeCompare(b.quote.id, 'en'))
  const index = shuffled.findIndex(puzzle => puzzle.quote.id === currentId)
  const current = shuffled[index]
  const ordered = [...shuffled.slice(index + 1), ...shuffled.slice(0, Math.max(0, index))]
  const unfinished = ordered.filter(puzzle => !isComplete(puzzle, sessions[puzzle.quote.id]!))
  const differentLevel = unfinished.filter(puzzle => puzzle.quote.difficulty !== current?.quote.difficulty)
  return (differentLevel.find(puzzle => puzzle.quote.author !== current?.quote.author) ?? differentLevel[0]
    ?? unfinished.find(puzzle => puzzle.quote.author !== current?.quote.author) ?? unfinished[0] ?? ordered[0] ?? current)!.quote.id
}
