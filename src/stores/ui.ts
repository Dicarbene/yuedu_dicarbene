import { defineStore } from 'pinia'
import { uid } from '@/lib/utils'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  detail?: string
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as ToastItem[],
  }),
  actions: {
    pushToast(
      title: string,
      tone: ToastTone = 'info',
      detail?: string,
      ttl = 3400,
    ) {
      const item: ToastItem = {
        id: uid('toast'),
        tone,
        title,
        detail,
      }
      this.toasts.push(item)
      window.setTimeout(() => {
        this.dismissToast(item.id)
      }, ttl)
      return item.id
    },
    dismissToast(id: string) {
      this.toasts = this.toasts.filter(item => item.id !== id)
    },
  },
})
