<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, X } from '@lucide/vue'
const { t } = useI18n()
const props = defineProps<{ title: string; drawer?: boolean; busy?: boolean; page?: boolean; returnFocus?: HTMLElement }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement>()
const closing = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined
function requestClose() {
  if (closing.value || props.busy) return
  if (!props.drawer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { emit('close'); return }
  closing.value = true
  closeTimer = setTimeout(() => emit('close'), 200)
}
defineExpose({ requestClose })
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
})
onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  if (dialog.value instanceof HTMLDialogElement) dialog.value.close()
  Object.assign(document.body.style, bodyStyle)
  document.documentElement.style.overflow = htmlOverflow
  window.scrollTo({ top: scrollY, behavior: 'instant' })
  void nextTick(() => { if (previous?.isConnected) previous.focus({ preventScroll: true }) })
})
function backdrop(event: MouseEvent) {
  if (props.page || event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose()
}
</script>
<template>
  <component :is="page ? 'section' : 'dialog'" ref="dialog" :class="[page ? 'app-screen' : 'app-dialog', { 'app-drawer': drawer, closing }]" :role="page ? 'region' : undefined" aria-labelledby="dialog-title" :aria-busy="busy" @cancel.prevent="requestClose" @click="backdrop">
    <div class="dialog-header"><button v-if="page" class="icon-button screen-back" :aria-label="t('back')" :disabled="busy" @click="requestClose"><ArrowLeft :size="23" /></button><h2 id="dialog-title">{{ title }}</h2><button v-if="!page" class="icon-button" :aria-label="t('closeDialog')" :disabled="busy" @click="requestClose"><X :size="20" /></button></div>
    <slot />
  </component>
</template>
