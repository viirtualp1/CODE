export interface DragPoint { x: number; y: number; time: number }
/** Left drawer: lock intent once, never turn a vertical scroll into a swipe. */
export class DrawerDrag {
  private origin: DragPoint | null = null
  private samples: DragPoint[] = []
  private width = 1
  private initialOffset = 0
  intent: 'pending' | 'scroll' | 'drag' = 'pending'
  offset = 0
  begin(point: DragPoint, width: number, initialOffset = 0) {
    this.cancel(); this.origin = point; this.samples = [point]; this.width = Math.max(1, width); this.initialOffset = Math.max(-this.width, Math.min(0, initialOffset)); this.offset = this.initialOffset
  }
  move(point: DragPoint) {
    if (!this.origin) return this.intent
    const dx = point.x - this.origin.x, dy = point.y - this.origin.y
    if (this.intent === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
      this.intent = dx < 0 && -dx > Math.abs(dy) * 1.35 ? 'drag' : 'scroll'
    }
    if (this.intent === 'drag') {
      this.offset = Math.max(-this.width, Math.min(0, this.initialOffset + dx))
      this.samples = [...this.samples.filter(sample => point.time - sample.time <= 100), point]
    }
    return this.intent
  }
  release(point: DragPoint) {
    this.move(point)
    const first = this.samples[0]
    const velocity = first && point.time > first.time ? (first.x - point.x) / (point.time - first.time) : 0
    const distance = -this.offset
    const close = this.intent === 'drag' && (distance >= Math.min(100, Math.max(56, this.width * .3)) || distance >= 24 && velocity >= .55)
    this.cancel()
    return close
  }
  cancel() { this.origin = null; this.samples = []; this.intent = 'pending'; this.offset = 0 }
}
export function canStartDrawerDrag(pointerType: string, isPrimary: boolean, x: number, control: boolean, phone: boolean) {
  // Leave the OS back-gesture edge and form controls to their native handlers.
  return phone && isPrimary && (pointerType === 'touch' || pointerType === 'pen') && x > 24 && !control
}
