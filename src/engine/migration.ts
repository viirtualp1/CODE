import { clone, createPuzzle, validSession } from './cipher'
import type { Puzzle, Session, Snapshot } from './cipher'
/** Only the published v1 -> reviewed clues v2 transition is compatible; answers/seeds stay identical. */
export function migrateClues(puzzle: Puzzle, value: unknown): Session | null {
  if (puzzle.quote.revision !== 2 || !puzzle.quote.previousClues) return null
  const previous = createPuzzle({ ...puzzle.quote, revision: 1, clues: puzzle.quote.previousClues })
  if (!validSession(previous, value)) return null
  const reserved = new Set(Object.values(puzzle.clues))
  function upgrade(state: Snapshot): Snapshot {
    const entries = Object.fromEntries(Object.entries(state.entries).filter(([key, letter]) => !reserved.has(letter) || puzzle.clues[Number(key)] === letter))
    Object.assign(entries, puzzle.clues)
    return { entries, hints: state.hints.filter(symbol => !puzzle.clues[symbol]) }
  }
  const current = upgrade(value)
  function history(states: Snapshot[]) {
    const result = states.map(upgrade).filter((state, i, all) => i === 0 || JSON.stringify(state) !== JSON.stringify(all[i - 1]))
    while (result.length && JSON.stringify(result.at(-1)) === JSON.stringify(current)) result.pop()
    return result
  }
  const result = { ...current, undo: history(value.undo), redo: history(value.redo) }
  return validSession(puzzle, result) ? clone(result) : null
}
