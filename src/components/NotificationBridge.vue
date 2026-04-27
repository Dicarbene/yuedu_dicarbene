<script setup lang="ts">
import { watch } from 'vue'
import { useNotification } from 'naive-ui'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const notification = useNotification()

const toastMap = new Map<
  string,
  ReturnType<typeof notification.create>
>()

watch(
  () => ui.toasts,
  (toasts) => {
    const currentIds = new Set(toasts.map((t) => t.id))
    for (const [id, inst] of toastMap) {
      if (!currentIds.has(id)) {
        inst.destroy()
        toastMap.delete(id)
      }
    }
    for (const toast of toasts) {
      if (toastMap.has(toast.id)) continue
      const inst = notification.create({
        title: toast.title,
        content: toast.detail || '',
        type: toast.tone,
        duration: 0,
        closable: true,
        onClose: () => {
          ui.dismissToast(toast.id)
        },
      })
      toastMap.set(toast.id, inst)
    }
  },
)
</script>

<template>
  <div style="display: none" />
</template>
