<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { NButton, NDrawer, NDrawerContent, NInput } from 'naive-ui'
import { Wifi } from 'lucide-vue-next'
import { deriveWebSocketBase, normalizeHttpBase } from '@/lib/utils'
import type { ConnectionProfile } from '@/types/legado'

const props = defineProps<{
  visible: boolean
  profiles: ConnectionProfile[]
  currentHttpBase: string
}>()

const emit = defineEmits<{
  close: []
  connect: [{ label: string; httpBase: string }]
}>()

const form = reactive({
  label: '当前设备',
  httpBase: props.currentHttpBase,
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.httpBase = props.currentHttpBase
    if (props.profiles[0]) {
      form.label = props.profiles[0].label
    }
  },
  { immediate: true },
)

const wsPreview = computed(() => {
  try {
    return deriveWebSocketBase(form.httpBase)
  } catch {
    return 'ws://...'
  }
})

const submit = () => {
  emit('connect', {
    label: form.label.trim() || '当前设备',
    httpBase: normalizeHttpBase(form.httpBase),
  })
}
</script>

<template>
  <NDrawer :show="visible" :width="760" @update:show="(val: boolean) => !val && emit('close')">
    <NDrawerContent
      title="连接 Legado Web 服务"
      :native-scrollbar="false"
      @close="emit('close')"
    >
      <template #header>
        <div class="drawer-header">
          <div>
            <p class="drawer-kicker">LAN Connection</p>
            <h2 class="drawer-title">连接 Legado Web 服务</h2>
          </div>
        </div>
      </template>

      <div class="drawer-body">
        <div class="drawer-form">
          <label>
            <span>设备备注</span>
            <NInput
              v-model:value="form.label"
              type="text"
              placeholder="例如：Pixel 8 Pro / 家里安卓机"
            />
          </label>
          <label>
            <span>HTTP 地址</span>
            <NInput
              v-model:value="form.httpBase"
              type="text"
              placeholder="http://192.168.1.23:1234/"
            />
          </label>
          <div class="url-preview">
            <strong>WebSocket 推导地址</strong>
            <code>{{ wsPreview }}</code>
          </div>
          <div class="drawer-actions">
            <NButton type="primary" @click="submit">
              <template #icon>
                <Wifi :size="17" aria-hidden="true" />
              </template>
              连接并同步
            </NButton>
            <NButton @click="emit('close')">取消</NButton>
          </div>
        </div>

        <section class="history-panel" v-if="profiles.length > 0">
          <div class="history-head">
            <h3>最近连接</h3>
            <p>点击任一设备即可快速切换。</p>
          </div>
          <div class="history-list">
            <button
              v-for="profile in profiles"
              :key="profile.id"
              class="history-card"
              type="button"
              @click="
                emit('connect', {
                  label: profile.label,
                  httpBase: profile.httpBase,
                })
              "
            >
              <strong>{{ profile.label }}</strong>
              <span>{{ profile.httpBase }}</span>
            </button>
          </div>
        </section>

        <footer class="drawer-note">
          <p>手机与当前设备需要处于同一局域网，并在阅读 App 中开启 Web 服务。</p>
          <p>默认 HTTP 端口为 <code>1234</code>，搜索 WebSocket 端口通常是 <code>1235</code>。</p>
        </footer>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
}

.drawer-kicker {
  margin: 0 0 6px;
  color: var(--text-3);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

.drawer-title {
  margin: 0;
  font-family:
    "Source Han Serif SC",
    "Noto Serif SC",
    "Songti SC",
    serif;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.drawer-body {
  display: grid;
  gap: 24px;
}

.drawer-form {
  display: grid;
  gap: 16px;
}

.drawer-form label {
  display: grid;
  gap: 8px;
}

.drawer-form span,
.history-head p {
  color: var(--text-2);
  font-size: 0.92rem;
}

.url-preview {
  padding: 16px 18px;
  border-radius: 8px;
  background: rgba(255, 255, 253, 0.72);
  border: 1px solid var(--line);
}

.url-preview strong,
.history-head h3 {
  display: block;
  margin-bottom: 8px;
}

.url-preview code {
  color: var(--accent);
  word-break: break-all;
}

.drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.history-panel {
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.history-head {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.history-list {
  display: grid;
  gap: 12px;
}

.history-card {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 253, 0.7);
  cursor: pointer;
  color: var(--text-1);
  font: inherit;
  width: 100%;
}

.history-card:hover {
  background: rgba(255, 255, 253, 0.9);
}

.history-card span,
.drawer-note p {
  color: var(--text-2);
  font-size: 0.9rem;
}

.drawer-note {
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.drawer-note p {
  margin: 0;
}

.drawer-note p + p {
  margin-top: 8px;
}

.drawer-note code {
  color: var(--accent);
}
</style>
