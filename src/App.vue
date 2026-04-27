<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider, NNotificationProvider } from 'naive-ui'
import { useLegadoStore } from '@/stores/legado'
import { useUiStore } from '@/stores/ui'
import NotificationBridge from '@/components/NotificationBridge.vue'
import { themeOverrides } from '@/theme'

const legado = useLegadoStore()
const ui = useUiStore()

onMounted(async () => {
  try {
    const label =
      legado.profiles.find((profile) => profile.httpBase === legado.httpBase)
        ?.label ?? '当前设备'
    await legado.connect(legado.httpBase, label)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '无法连接到 Legado Web 服务'
    legado.setConnectionState('error', '未连接，请手动配置接口地址')
    ui.pushToast('自动连接未成功', 'warning', message)
  }
})
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NNotificationProvider>
      <NotificationBridge />
      <router-view v-slot="{ Component }">
        <transition name="router">
          <component :is="Component" />
        </transition>
      </router-view>
    </NNotificationProvider>
  </NConfigProvider>
</template>
