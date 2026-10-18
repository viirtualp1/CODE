import { describe, expect, it } from 'vitest'
import { navigationTarget } from './navigation'
const cells = [
  { index: 0, x: 10, y: 0, locked: true },
  { index: 1, x: 40, y: 0, locked: false },
  { index: 2, x: 70, y: 0, locked: false },
  { index: 3, x: 10, y: 70, locked: false },
  { index: 4, x: 40, y: 70, locked: true },
  { index: 5, x: 70, y: 70, locked: false },
  { index: 6, x: 10, y: 140, locked: false },
]
describe('spatial keyboard navigation', () => {
  it('moves in reading order, skips clues and keeps the boundary', () => {
    expect(navigationTarget(cells, 3, 'ArrowRight')).toBe(5)
    expect(navigationTarget(cells, 3, 'ArrowLeft')).toBe(2)
    expect(navigationTarget(cells, 6, 'ArrowRight')).toBe(6)
    expect(navigationTarget(cells, 1, 'ArrowLeft')).toBe(1)
  })
  it('moves vertically to the nearest editable cell on the adjacent visual row', () => {
    expect(navigationTarget(cells, 2, 'ArrowDown')).toBe(5)
    expect(navigationTarget(cells, 5, 'ArrowUp')).toBe(2)
    expect(navigationTarget(cells, 5, 'ArrowDown')).toBe(6)
    expect(navigationTarget(cells, 1, 'ArrowUp')).toBe(1)
  })
  it('supports first/last shortcuts and empty or fully revealed boards', () => {
    expect(navigationTarget(cells, 5, 'Home')).toBe(1)
    expect(navigationTarget(cells, 1, 'End')).toBe(6)
    expect(navigationTarget([], null, 'ArrowRight')).toBe(null)
    expect(navigationTarget(cells.map(c => ({ ...c, locked: true })), 1, 'End')).toBe(null)
  })
})
