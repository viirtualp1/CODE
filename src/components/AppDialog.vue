<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { X } from '@lucide/vue'
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
let previous: HTMLElement | null = null
let scrollY = 0
let bodyStyle = { overflow: '', position: '', top: '', width: '', paddingRight: '' }
let htmlOverflow = ''
onMounted(() => {
  previous = document.activeElement as HTMLElement
  scrollY = window.scrollY
  const body = document.body
  bodyStyle = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width, paddingRight: body.style.paddingRight }
  htmlOverflow = document.documentElement.style.overflow
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  const originalPadding = parseFloat(getComputedStyle(body).paddingRight) || 0
  Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollY}px`, width: '100%', paddingRight: `${originalPadding + scrollbar}px` })
  document.documentElement.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  Object.assign(document.body.style, bodyStyle)
  document.documentElement.style.overflow = htmlOverflow
  window.scrollTo({ top: scrollY, behavior: 'instant' })
  previous?.focus({ preventScroll: true })
})
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) emit('close')
}
</script>
<template>
  <dialog ref="dialog" class="app-dialog" aria-labelledby="dialog-title" @cancel.prevent="emit('close')" @click="backdrop">
    <div class="dialog-header"><h2 id="dialog-title">{{ title }}</h2><button class="icon-button" aria-label="Close dialog" @click="emit('close')"><X :size="20" /></button></div>
    <slot />
  </dialog>
</template>
