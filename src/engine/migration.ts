import { clone, createPuzzle, validSession } from './cipher'
import type { Puzzle, Session, Snapshot } from './cipher'
/** Only explicitly recorded clue revisions are compatible; answers and seeds stay identical. */
export function migrateClues(puzzle: Puzzle, value: unknown, revision = 1): Session | null {
  const clues = puzzle.quote.previousClues?.[revision]
  if (!clues) return null
  const previous = createPuzzle({ ...puzzle.quote, revision, clues })
  if (!validSession(previous, value)) return null
  const reserved = new Set(Object.values(puzzle.clues))
  function upgrade(state: Snapshot): Snapshot {
    const complete = previous.symbols.every(symbol => state.entries[symbol] === previous.solution[symbol])
    const entries = Object.fromEntries(Object.entries(state.entries).filter(([key, letter]) => {
      const symbol = Number(key)
      // Remove withdrawn automatic givens from unfinished snapshots, never a player's guess or hint.
      if (!complete && previous.clues[symbol] && !puzzle.clues[symbol]) return false
      return !reserved.has(letter) || puzzle.clues[symbol] === letter
    }))
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
