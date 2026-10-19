import { isComplete } from './cipher'
import type { Puzzle, Session } from './cipher'
export type ProgressStatus = 'new' | 'started' | 'complete'
export function progressStatus(puzzle: Puzzle, session: Session): ProgressStatus {
  if (isComplete(puzzle, session)) return 'complete'
  return session.hints.length || session.undo.length || session.redo.length || Object.keys(session.entries).some(key => !puzzle.clues[Number(key)]) ? 'started' : 'new'
}
export function nextPuzzleId(puzzles: readonly Puzzle[], sessions: Record<string, Session>, currentId: string): string {
  const index = puzzles.findIndex(puzzle => puzzle.quote.id === currentId)
  const ordered = [...puzzles.slice(index + 1), ...puzzles.slice(0, index)]
  const difficulty = puzzles[index]?.quote.difficulty
  const unfinished = ordered.filter(puzzle => !isComplete(puzzle, sessions[puzzle.quote.id]!))
  return (unfinished.find(puzzle => puzzle.quote.difficulty === difficulty) ?? unfinished[0] ?? ordered[0] ?? puzzles[index])!.quote.id
}
