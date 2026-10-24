<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, ref, computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, X } from '@lucide/vue'
import { canStartDrawerDrag, DrawerDrag } from '../interaction/drawer'
const { t } = useI18n()
const props = defineProps<{ title: string; drawer?: boolean; busy?: boolean; page?: boolean; returnFocus?: HTMLElement }>()
const emit = defineEmits<{ close: [] }>()
const titleId = useId()
const dialog = ref<HTMLElement>()
const closing = ref(false)
const dragging = ref(false)
const tracking = ref(false)
const offset = ref(0)
const width = ref(1)
const drag = new DrawerDrag()
let pointer: number | null = null
let suppressClick = false
let clickTimer: ReturnType<typeof setTimeout> | undefined
let closeTimer: ReturnType<typeof setTimeout> | undefined
const drawerStyle = computed(() => props.drawer ? { transform: `translateX(${offset.value}px)`, '--drawer-backdrop': String(Math.max(0, 1 + offset.value / width.value)) } : undefined)
function cancelDrag() {
  const id = pointer; pointer = null
  if (id !== null && dialog.value?.hasPointerCapture(id)) dialog.value.releasePointerCapture(id)
  drag.cancel(); dragging.value = false; tracking.value = false
  if (!closing.value) offset.value = 0
}
function requestClose() {
  if (closing.value || props.busy) return
  cancelDrag()
  if (!props.drawer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { emit('close'); return }
  width.value = dialog.value?.getBoundingClientRect().width ?? 1
  closing.value = true; offset.value = -width.value
  closeTimer = setTimeout(() => emit('close'), 200)
}
defineExpose({ requestClose })
const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY, time: event.timeStamp })
function pointerDown(event: PointerEvent) {
  if (!props.drawer || props.busy || closing.value) return
  if (!event.isPrimary) { cancelDrag(); return }
  const target = event.target instanceof Element ? event.target : null
  const phone = window.matchMedia('(max-width: 700px), (max-height: 580px) and (orientation: landscape)').matches
  if (!canStartDrawerDrag(event.pointerType, event.isPrimary, event.clientX, !!target?.closest('input, select, textarea, [contenteditable], [data-no-drawer-swipe]'), phone)) return
  const rect = dialog.value?.getBoundingClientRect()
  if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
  cancelDrag(); suppressClick = false; clearTimeout(clickTimer)
  width.value = rect?.width ?? 1
  // Freeze any interrupted entry/snap-back at its current visual position.
  offset.value = Math.min(0, rect?.left ?? 0); tracking.value = true
  pointer = event.pointerId; drag.begin(point(event), width.value, offset.value)
}
function pointerMove(event: PointerEvent) {
  if (event.pointerId !== pointer || closing.value) return
  if (drag.move(point(event)) !== 'drag') return
  if (event.cancelable) event.preventDefault()
  if (!dragging.value) dialog.value?.setPointerCapture(event.pointerId)
  dragging.value = true; offset.value = drag.offset
}
function pointerUp(event: PointerEvent) {
  if (event.pointerId !== pointer) return
  const wasDragging = dragging.value
  const close = drag.release(point(event))
  cancelDrag()
  if (wasDragging) {
    suppressClick = true
    clickTimer = setTimeout(() => { suppressClick = false }, 0)
  }
  if (close) requestClose()
}
function pointerCancel(event: PointerEvent) {
  if (event.pointerId === pointer) cancelDrag()
}
function lostCapture(event: PointerEvent) {
  // Child buttons lose implicit touch capture when the drawer takes ownership.
  if (event.target === dialog.value) pointerCancel(event)
}
function captureClick(event: MouseEvent) {
  if (suppressClick || closing.value) { event.preventDefault(); event.stopImmediatePropagation() }
}
let previous: HTMLElement | null = null
let scrollY = 0
let bodyStyle = { overflow: '', position: '', top: '', width: '', paddingRight: '' }
let htmlOverflow = ''
onMounted(() => {
  previous = props.returnFocus ?? document.activeElement as HTMLElement
  scrollY = window.scrollY
  const body = document.body
  bodyStyle = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width, paddingRight: body.style.paddingRight }
  htmlOverflow = document.documentElement.style.overflow
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  const originalPadding = parseFloat(getComputedStyle(body).paddingRight) || 0
  Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollY}px`, width: '100%', paddingRight: `${originalPadding + scrollbar}px` })
  document.documentElement.style.overflow = 'hidden'
  if (dialog.value instanceof HTMLDialogElement) dialog.value.showModal()
  else dialog.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  window.addEventListener('resize', cancelDrag)
  window.addEventListener('blur', cancelDrag)
})
onBeforeUnmount(() => {
  clearTimeout(closeTimer); clearTimeout(clickTimer); cancelDrag()
  window.removeEventListener('resize', cancelDrag)
  window.removeEventListener('blur', cancelDrag)
  if (dialog.value instanceof HTMLDialogElement) dialog.value.close()
  Object.assign(document.body.style, bodyStyle)
  document.documentElement.style.overflow = htmlOverflow
  window.scrollTo({ top: scrollY, behavior: 'instant' })
  void nextTick(() => { const target = props.returnFocus ?? previous; if (target?.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true }) })
})
function trapFocus(event: KeyboardEvent) {
  if (props.page || event.key !== 'Tab') return
  const controls = [...(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') ?? [])].filter(element => element.getClientRects().length && !element.closest('[inert]'))
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function backdrop(event: MouseEvent) {
  if (props.page || event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose()
}
</script>
<template>
  <component :is="page ? 'section' : 'dialog'" ref="dialog" :class="[page ? 'app-screen' : 'app-dialog', { 'app-drawer': drawer, closing, dragging, tracking }]" :style="drawerStyle" :role="page ? 'region' : undefined" :aria-labelledby="titleId" :aria-busy="busy" @keydown="trapFocus" @cancel.prevent="requestClose" @click.capture="captureClick" @click="backdrop" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerCancel" @lostpointercapture="lostCapture">
    <div class="dialog-header"><button v-if="page" class="icon-button screen-back" :aria-label="t('back')" :disabled="busy" @click="requestClose"><ArrowLeft :size="23" /></button><h2 :id="titleId">{{ title }}</h2><button v-if="!page" class="icon-button" :aria-label="t('closeDialog')" :disabled="busy" @click="requestClose"><X :size="20" /></button></div>
    <slot />
  </component>
</template>
