<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Theme } from '../services/storage'
defineProps<{ modelValue: Theme; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: Theme] }>()
const { t } = useI18n()
const options = [{ value: 'system', label: 'system' }, { value: 'dark', label: 'dark' }, { value: 'light', label: 'light' }] as const
</script>
<template>
  <fieldset class="appearance-setting" :disabled="disabled">
    <legend>{{ t('appearance') }}</legend>
    <div class="appearance-control">
      <label v-for="option in options" :key="option.value" :class="{ chosen: modelValue === option.value }">
        <input type="radio" name="appearance" :value="option.value" :checked="modelValue === option.value" @change="emit('update:modelValue', option.value)" />
        <span>{{ t(option.label) }}</span>
      </label>
    </div>
  </fieldset>
</template>
