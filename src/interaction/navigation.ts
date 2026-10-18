export type NavigationKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'
export interface NavigableCell { index: number; x: number; y: number; locked: boolean }

/** DOM order is reading order; vertical arrows follow the currently rendered rows. */
export function navigationTarget(cells: NavigableCell[], active: number | null, key: NavigationKey): number | null {
  const editable = cells.filter(cell => !cell.locked)
  if (!editable.length) return null
  if (key === 'Home') return editable[0]!.index
  if (key === 'End') return editable.at(-1)!.index
  const origin = cells.find(cell => cell.index === active) ?? editable[0]!
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const forward = key === 'ArrowRight'
    return (forward ? editable.find(cell => cell.index > origin.index) : [...editable].reverse().find(cell => cell.index < origin.index))?.index ?? origin.index
  }
  const below = key === 'ArrowDown'
  const candidates = editable.filter(cell => below ? cell.y > origin.y + 4 : cell.y < origin.y - 4)
  if (!candidates.length) return origin.index
  const rowY = below ? Math.min(...candidates.map(cell => cell.y)) : Math.max(...candidates.map(cell => cell.y))
  const row = candidates.filter(cell => Math.abs(cell.y - rowY) < 4)
  return row.reduce((best, cell) => Math.abs(cell.x - origin.x) < Math.abs(best.x - origin.x) ? cell : best).index
}
