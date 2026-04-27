<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  NButton,
  NInput,
  NSelect,
  NSlider,
  NSwitch,
  NTabs,
  NTabPane,
} from 'naive-ui'
import {
  ArrowLeft,
  ArrowUp,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Library,
  List,
  Moon,
  PanelRight,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-vue-next'
import ReaderChapterBlock from '@/components/ReaderChapterBlock.vue'
import {
  DEFAULT_READ_CONFIG,
  FONT_PRESETS,
  READER_THEMES,
} from '@/lib/constants'
import { clamp, formatRelativeTime } from '@/lib/utils'
import { useLegadoStore } from '@/stores/legado'
import { useUiStore } from '@/stores/ui'
import type { BookChapter } from '@/types/legado'

type LoadedChapter = {
  catalogIndex: number
  apiIndex: number
  title: string
  paragraphs: string[]
}

type ChapterBlockExpose = {
  scrollToReadedLength(length: number): void
}

const router = useRouter()
const legado = useLegadoStore()
const ui = useUiStore()

const loading = ref(false)
const loadedChapters = ref<LoadedChapter[]>([])
const chapterRefs = ref<ChapterBlockExpose[]>([])
const catalogQuery = ref('')
const catalogListRef = ref<HTMLElement>()
const activePanel = ref<'catalog' | 'settings' | 'bookmarks'>('catalog')
const panelVisible = ref(true)
const autoScrolling = ref(false)
const savingPreview = ref(false)
let autoScrollFrame = 0
let lastAutoScroll = 0
let pendingScroll = 0
let lastProgressSync = 0
let progressSyncTimer = 0
let didNavigateSync = false

const themeOptions = READER_THEMES.map((t) => ({ value: t.id, label: t.label }))
const fontOptions = [
  ...FONT_PRESETS.map((f) => ({ value: f.id, label: f.label })),
  { value: -1, label: '自定义' },
]

const theme = computed(
  () => READER_THEMES[legado.readConfig.theme] ?? READER_THEMES[0],
)
const themeVars = computed(() => ({
  '--reader-shell': theme.value.shell,
  '--reader-page': theme.value.page,
  '--reader-surface': theme.value.surface,
  '--reader-card': theme.value.card,
  '--reader-text': theme.value.text,
  '--reader-muted': theme.value.muted,
  '--reader-accent': theme.value.accent,
  '--reader-border': theme.value.border,
  '--reader-shadow': theme.value.shadow,
}))
const currentBook = computed(() => legado.currentBook)
const currentChapter = computed(() => {
  const book = currentBook.value
  if (!book) return undefined
  return legado.catalog[book.chapterIndex]
})
const currentCatalogIndex = computed(() => currentBook.value?.chapterIndex ?? 0)
const progressPercent = computed(() => {
  if (legado.catalog.length === 0) return 0
  return Math.round(((currentCatalogIndex.value + 1) / legado.catalog.length) * 100)
})
const filteredCatalog = computed(() => {
  const keyword = catalogQuery.value.trim().toLowerCase()
  if (!keyword) return legado.catalog
  return legado.catalog.filter((chapter) =>
    chapter.title.toLowerCase().includes(keyword),
  )
})
const fontFamily = computed(() => {
  if (legado.readConfig.font >= 0) {
    return FONT_PRESETS[legado.readConfig.font]?.family ?? FONT_PRESETS[0].family
  }
  return legado.readConfig.customFontName || FONT_PRESETS[0].family
})
const readWidth = computed(() =>
  clamp(legado.readConfig.readWidth, 640, Math.max(window.innerWidth - 360, 680)),
)
const pageWidth = computed(() => {
  if (window.innerWidth < 980) return '100%'
  return `${readWidth.value}px`
})
const chapterTitle = computed(() => currentChapter.value?.title ?? '正在载入')
const isPreviewBook = computed(
  () => currentBook.value != null && !currentBook.value.keepOnShelf,
)

async function ensureReaderReady() {
  const book = legado.currentBook
  if (!book) {
    router.replace('/')
    return
  }

  loading.value = true
  try {
    await legado.loadCatalog(book)
    loading.value = false
    await loadChapter(book.chapterIndex, true, book.chapterPos)
    document.title = `${book.name} | ${chapterTitle.value}`
    scrollToActiveChapter()
  } catch (error) {
    ui.pushToast(
      '打开书籍失败',
      'error',
      error instanceof Error ? error.message : '无法读取目录或正文',
    )
    router.replace('/')
  } finally {
    loading.value = false
  }
}

async function loadChapter(catalogIndex: number, reload = true, chapterPos = 0) {
  const book = legado.currentBook
  const chapter = legado.catalog[catalogIndex]
  if (!book || !chapter || loading.value) return

  loading.value = true
  try {
    const paragraphs = await legado.loadChapterParagraphs(book.bookUrl, chapter.index)
    const item: LoadedChapter = {
      catalogIndex,
      apiIndex: chapter.index,
      title: chapter.title,
      paragraphs,
    }

    if (reload) {
      loadedChapters.value = [item]
      legado.updateProgress(catalogIndex, chapterPos)
      window.scrollTo({ top: 0, behavior: 'auto' })
      await nextTick()
      chapterRefs.value[0]?.scrollToReadedLength(chapterPos)
    } else if (!loadedChapters.value.some((loaded) => loaded.catalogIndex === catalogIndex)) {
      loadedChapters.value.push(item)
    }
  } catch (error) {
    ui.pushToast(
      '章节载入失败',
      'error',
      error instanceof Error ? error.message : '无法读取正文',
    )
  } finally {
    loading.value = false
  }
}

async function goChapter(chapter: BookChapter | number, chapterPos = 0) {
  const index = typeof chapter === 'number' ? chapter : legado.catalog.indexOf(chapter)
  if (index < 0) return
  await syncProgress()
  await loadChapter(index, true, chapterPos)
}

async function goPrev() {
  if (currentCatalogIndex.value <= 0) {
    ui.pushToast('已经是第一章', 'info')
    return
  }
  await goChapter(currentCatalogIndex.value - 1)
}

async function goNext() {
  if (currentCatalogIndex.value >= legado.catalog.length - 1) {
    ui.pushToast('已经是最后一章', 'info')
    return
  }
  await goChapter(currentCatalogIndex.value + 1)
}

async function loadMoreIfNeeded() {
  if (!legado.readConfig.infiniteLoading || loading.value) return
  const last = loadedChapters.value.at(-1)
  if (!last || last.catalogIndex >= legado.catalog.length - 1) return
  const remaining =
    document.documentElement.scrollHeight -
    window.scrollY -
    window.innerHeight
  if (remaining < 720) {
    await loadChapter(last.catalogIndex + 1, false, 0)
  }
}

function updateProgress(catalogIndex: number, chapterPos: number) {
  legado.updateProgress(catalogIndex, chapterPos)
  if (Date.now() - lastProgressSync > 60000) {
    syncProgress()
    return
  }
  if (progressSyncTimer) return
  progressSyncTimer = window.setTimeout(() => {
    progressSyncTimer = 0
    syncProgress()
  }, 12000)
}

async function syncProgress(keepAlive = false) {
  lastProgressSync = Date.now()
  try {
    await legado.syncProgress(keepAlive)
  } catch {
    if (!keepAlive) ui.pushToast('进度暂未同步', 'warning')
  }
}

function addBookmark() {
  const book = legado.currentBook
  const chapter = currentChapter.value
  if (!book || !chapter) return
  legado.addBookmark({
    bookUrl: book.bookUrl,
    chapterIndex: book.chapterIndex,
    chapterTitle: chapter.title,
    chapterPos: book.chapterPos,
    label: `${chapter.title} · ${book.chapterPos} 字`,
  })
  ui.pushToast('已添加书签', 'success')
}

async function keepPreviewBook() {
  const book = legado.currentBook
  if (!book) return
  savingPreview.value = true
  try {
    await legado.ensureBookOnShelf(book)
    legado.markCurrentBookKept()
    await legado.refreshShelf()
    ui.pushToast('已保留到书架', 'success')
  } catch (error) {
    ui.pushToast(
      '保留失败',
      'error',
      error instanceof Error ? error.message : '无法写入书架',
    )
  } finally {
    savingPreview.value = false
  }
}

async function discardPreviewAndBack() {
  await legado.cleanupPreviewBook()
  router.push('/')
}

function resetSettings() {
  legado.updateReadConfig(DEFAULT_READ_CONFIG)
  legado.updateLocalPrefs({ autoScrollSpeed: 26, showChapterIndex: true })
}

function toggleAutoScroll() {
  autoScrolling.value = !autoScrolling.value
  if (autoScrolling.value) {
    pendingScroll = 0
    lastAutoScroll = performance.now()
    autoScrollFrame = window.requestAnimationFrame(autoScrollStep)
  } else {
    window.cancelAnimationFrame(autoScrollFrame)
  }
}

function cycleTheme() {
  const next = (legado.readConfig.theme + 1) % READER_THEMES.length
  legado.updateReadConfig({ theme: next })
}

function autoScrollStep(now: number) {
  if (!autoScrolling.value) return
  const delta = Math.min(now - lastAutoScroll, 40) / 1000
  lastAutoScroll = now
  pendingScroll += legado.localPrefs.autoScrollSpeed * delta
  const integerScroll = Math.trunc(pendingScroll)
  if (integerScroll !== 0) {
    window.scrollBy({ top: integerScroll, behavior: 'auto' })
    pendingScroll -= integerScroll
  }
  loadMoreIfNeeded()
  autoScrollFrame = window.requestAnimationFrame(autoScrollStep)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) return
  if (event.target instanceof HTMLTextAreaElement) return
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    goPrev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    goNext()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    window.scrollBy({ top: -window.innerHeight * 0.72, behavior: 'smooth' })
  } else if (event.key === 'ArrowDown' || event.key === ' ') {
    event.preventDefault()
    window.scrollBy({ top: window.innerHeight * 0.72, behavior: 'smooth' })
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    syncProgress(true)
  }
}

function backToLibrary() {
  router.push('/')
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToActiveChapter() {
  nextTick(() => {
    const container = catalogListRef.value
    if (!container) return
    const active = container.querySelector('button.active') as HTMLElement | null
    active?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

watch(activePanel, (val) => {
  if (val === 'catalog') scrollToActiveChapter()
})

watch(currentCatalogIndex, () => {
  if (activePanel.value === 'catalog') scrollToActiveChapter()
})

watch(chapterTitle, (title) => {
  if (legado.currentBook) document.title = `${legado.currentBook.name} | ${title}`
})

onMounted(() => {
  ensureReaderReady()
  window.addEventListener('scroll', loadMoreIfNeeded, { passive: true })
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', loadMoreIfNeeded)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.cancelAnimationFrame(autoScrollFrame)
  if (progressSyncTimer) window.clearTimeout(progressSyncTimer)
  if (!didNavigateSync) syncProgress(true)
})

onBeforeRouteLeave(async () => {
  didNavigateSync = true
  await syncProgress(true)
  if (isPreviewBook.value) {
    await legado.cleanupPreviewBook()
  }
})
</script>

<template>
  <main class="reader-view" :style="themeVars">
    <header class="reader-topbar">
      <NButton class="icon-button" @click="backToLibrary">
        <template #icon>
          <ArrowLeft :size="18" aria-hidden="true" />
        </template>
      </NButton>
      <div class="reader-title">
        <strong>{{ currentBook?.name || '阅读' }}</strong>
        <span>{{ chapterTitle }}</span>
      </div>
      <div class="reader-top-actions">
        <NButton class="icon-button" @click="scrollToTop">
          <template #icon>
            <ArrowUp :size="18" aria-hidden="true" />
          </template>
        </NButton>
        <NButton class="icon-button" @click="panelVisible = !panelVisible">
          <template #icon>
            <PanelRight :size="18" aria-hidden="true" />
          </template>
        </NButton>
      </div>
    </header>

    <div v-if="isPreviewBook" class="preview-strip">
      <div>
        <strong>试读中</strong>
        <span>离开阅读器时会从 Legado 缓存移除。</span>
      </div>
      <div class="preview-actions">
        <NButton
          type="primary"
          :disabled="savingPreview"
          @click="keepPreviewBook"
        >
          <template #icon>
            <Check :size="17" aria-hidden="true" />
          </template>
          保留
        </NButton>
        <NButton @click="discardPreviewAndBack">
          <template #icon>
            <CircleOff :size="17" aria-hidden="true" />
          </template>
          丢弃
        </NButton>
      </div>
    </div>

    <section class="reader-layout" :class="{ 'panel-hidden': !panelVisible }">
      <article class="page-frame" :style="{ maxWidth: pageWidth }">
        <div class="chapter-progress" aria-hidden="true">
          <span :style="{ width: `${progressPercent}%` }"></span>
        </div>

        <div v-if="loading && loadedChapters.length === 0" class="reader-loading">
          <BookOpen :size="34" aria-hidden="true" />
          <p>正在载入正文</p>
        </div>

        <ReaderChapterBlock
          v-for="chapter in loadedChapters"
          :key="chapter.apiIndex"
          ref="chapterRefs"
          :catalog-index="chapter.catalogIndex"
          :title="chapter.title"
          :paragraphs="chapter.paragraphs"
          :font-family="fontFamily"
          :font-size="legado.readConfig.fontSize"
          :spacing="legado.readConfig.spacing"
          :display-width="readWidth"
          :show-chapter-index="legado.localPrefs.showChapterIndex"
          @progress="updateProgress"
        />

        <footer class="reader-pagination">
          <NButton @click="goPrev">
            <template #icon>
              <ChevronLeft :size="17" aria-hidden="true" />
            </template>
            上一章
          </NButton>
          <NButton type="primary" @click="goNext">
            下一章
            <template #icon>
              <ChevronRight :size="17" aria-hidden="true" />
            </template>
          </NButton>
        </footer>
      </article>

      <aside class="reader-panel" v-if="panelVisible">
        <NTabs
          v-model:value="activePanel"
          type="line"
          justify-content="space-evenly"
        >
          <NTabPane name="catalog">
            <template #tab>
              <List :size="18" aria-hidden="true" />
            </template>
            <section class="panel-section">
              <div class="panel-head">
                <h2>目录</h2>
                <span>{{ currentCatalogIndex + 1 }} / {{ legado.catalog.length }}</span>
              </div>
              <NInput
                v-model:value="catalogQuery"
                type="text"
                placeholder="搜索章节"
                size="small"
              >
                <template #prefix>
                  <Search :size="16" aria-hidden="true" />
                </template>
              </NInput>
              <div ref="catalogListRef" class="catalog-list">
                <button
                  v-for="chapter in filteredCatalog"
                  :key="chapter.url + chapter.index"
                  type="button"
                  :class="{ active: chapter.index === currentChapter?.index }"
                  @click="goChapter(chapter)"
                >
                  <strong>{{ chapter.title }}</strong>
                  <span v-if="chapter.wordCount">{{ chapter.wordCount }}</span>
                </button>
              </div>
            </section>
          </NTabPane>

          <NTabPane name="settings">
            <template #tab>
              <SlidersHorizontal :size="18" aria-hidden="true" />
            </template>
            <section class="panel-section settings-section">
              <div class="panel-head">
                <h2>阅读设置</h2>
                <NButton size="tiny" @click="resetSettings">
                  <template #icon>
                    <Settings2 :size="16" aria-hidden="true" />
                  </template>
                </NButton>
              </div>

              <label class="setting-row">
                <span>主题</span>
                <NSelect
                  :value="legado.readConfig.theme"
                  :options="themeOptions"
                  @update:value="(val: number) => legado.updateReadConfig({ theme: val })"
                />
              </label>

              <label class="setting-row">
                <span>字体</span>
                <NSelect
                  :value="legado.readConfig.font"
                  :options="fontOptions"
                  @update:value="(val: number) => legado.updateReadConfig({ font: val })"
                />
              </label>

              <label v-if="legado.readConfig.font < 0" class="setting-row">
                <span>字体名称</span>
                <NInput
                  :value="legado.readConfig.customFontName"
                  placeholder="已安装字体的完整名称"
                  @update:value="(val: string) => legado.updateReadConfig({ customFontName: val })"
                />
              </label>

              <div class="setting-divider"></div>

              <label class="setting-row">
                <span>字号 {{ legado.readConfig.fontSize }}px</span>
                <NSlider
                  :value="legado.readConfig.fontSize"
                  :min="14"
                  :max="36"
                  @update:value="(val: number) => legado.updateReadConfig({ fontSize: val })"
                />
              </label>

              <label class="setting-row">
                <span>阅读宽度 {{ legado.readConfig.readWidth }}px</span>
                <NSlider
                  :value="legado.readConfig.readWidth"
                  :min="640"
                  :max="1120"
                  :step="20"
                  @update:value="(val: number) => legado.updateReadConfig({ readWidth: val })"
                />
              </label>

              <label class="setting-row">
                <span>行距 {{ legado.readConfig.spacing.line.toFixed(1) }}</span>
                <NSlider
                  :value="legado.readConfig.spacing.line"
                  :min="0.55"
                  :max="1.35"
                  :step="0.05"
                  @update:value="(val: number) => legado.updateReadConfig({ spacing: { line: val } })"
                />
              </label>

              <label class="toggle-row">
                <NSwitch
                  :value="legado.readConfig.infiniteLoading"
                  @update:value="(val: boolean) => legado.updateReadConfig({ infiniteLoading: val })"
                />
                <span>无限加载</span>
              </label>

              <label class="toggle-row">
                <NSwitch
                  :value="legado.localPrefs.showChapterIndex"
                  @update:value="(val: boolean) => legado.updateLocalPrefs({ showChapterIndex: val })"
                />
                <span>显示章节序号</span>
              </label>

              <div class="auto-scroll-box">
                <div>
                  <strong>自动滚动</strong>
                  <span>{{ legado.localPrefs.autoScrollSpeed }} px/s</span>
                </div>
                <NSlider
                  :value="legado.localPrefs.autoScrollSpeed"
                  :min="8"
                  :max="90"
                  @update:value="(val: number) => legado.updateLocalPrefs({ autoScrollSpeed: val })"
                />
                <NButton @click="toggleAutoScroll">
                  <template #icon>
                    <Pause v-if="autoScrolling" :size="17" aria-hidden="true" />
                    <Play v-else :size="17" aria-hidden="true" />
                  </template>
                  {{ autoScrolling ? '暂停' : '开始' }}
                </NButton>
              </div>
            </section>
          </NTabPane>

          <NTabPane name="bookmarks">
            <template #tab>
              <Bookmark :size="18" aria-hidden="true" />
            </template>
            <section class="panel-section">
              <div class="panel-head">
                <h2>书签</h2>
                <NButton size="tiny" @click="addBookmark">
                  <template #icon>
                    <Plus :size="16" aria-hidden="true" />
                  </template>
                </NButton>
              </div>
              <div class="bookmark-list" v-if="legado.currentBookmarks.length > 0">
                <article v-for="mark in legado.currentBookmarks" :key="mark.id">
                  <button type="button" @click="goChapter(mark.chapterIndex, mark.chapterPos)">
                    <strong>{{ mark.chapterTitle }}</strong>
                    <span>{{ formatRelativeTime(mark.createdAt) }}</span>
                  </button>
                  <button
                    class="delete-mark"
                    type="button"
                    title="删除书签"
                    @click="legado.removeBookmark(mark.bookUrl, mark.id)"
                  >
                    <Trash2 :size="15" aria-hidden="true" />
                  </button>
                </article>
              </div>
              <div v-else class="panel-empty">
                <Bookmark :size="28" aria-hidden="true" />
                <p>当前书籍还没有书签。</p>
              </div>
            </section>
          </NTabPane>
        </NTabs>

        <footer class="panel-footer">
          <NButton @click="backToLibrary">
            <template #icon>
              <Library :size="17" aria-hidden="true" />
            </template>
            书架
          </NButton>
          <NButton type="primary" @click="addBookmark">
            <template #icon>
              <Bookmark :size="17" aria-hidden="true" />
            </template>
            标记
          </NButton>
        </footer>
      </aside>
    </section>

    <nav class="reader-float">
    <NButton class="float-btn" @click="goPrev">
      <template #icon>
        <ChevronLeft :size="20" aria-hidden="true" />
      </template>
    </NButton>
    <NButton class="float-btn" @click="toggleAutoScroll">
      <template #icon>
        <Pause v-if="autoScrolling" :size="20" aria-hidden="true" />
        <Play v-else :size="20" aria-hidden="true" />
      </template>
    </NButton>
    <NButton class="float-btn" @click="goNext">
      <template #icon>
        <ChevronRight :size="20" aria-hidden="true" />
      </template>
    </NButton>
    <NButton class="float-btn" @click="cycleTheme">
      <template #icon>
        <Moon :size="20" aria-hidden="true" />
      </template>
    </NButton>
  </nav>
  </main>
</template>

<style scoped>
.reader-view {
  min-height: 100vh;
  color: var(--reader-text);
  background: var(--reader-shell);
}

.reader-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--reader-border);
  background: color-mix(in oklab, var(--reader-surface) 92%, transparent 8%);
  backdrop-filter: blur(18px);
}

.reader-title {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.reader-title strong,
.reader-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader-title span {
  color: var(--reader-muted);
  font-size: 0.88rem;
}

.reader-top-actions,
.preview-actions,
.reader-pagination,
.panel-footer {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-button {
  width: 40px;
  height: 40px;
}

.preview-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--reader-border);
  background: color-mix(in oklab, var(--reader-accent) 12%, var(--reader-surface));
}

.preview-strip div:first-child {
  display: grid;
  gap: 2px;
}

.preview-strip span {
  color: var(--reader-muted);
  font-size: 0.9rem;
}

.reader-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
  padding: 28px;
}

.reader-layout.panel-hidden {
  grid-template-columns: minmax(0, 1fr);
}

.page-frame {
  position: relative;
  width: 100%;
  margin: 0 auto 120px;
  padding: clamp(28px, 5vw, 74px);
  border: 1px solid var(--reader-border);
  border-radius: 8px;
  background: var(--reader-page);
  box-shadow:
    var(--reader-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.chapter-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: color-mix(in oklab, var(--reader-muted) 18%, transparent);
  overflow: hidden;
}

.chapter-progress span {
  display: block;
  height: 100%;
  background: var(--reader-accent);
}

.reader-loading,
.panel-empty {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 260px;
  color: var(--reader-muted);
}

.reader-loading p,
.panel-empty p,
.panel-head h2,
.panel-head span {
  margin: 0;
}

.reader-pagination {
  justify-content: space-between;
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--reader-border);
}

.reader-panel {
  position: sticky;
  top: 76px;
  max-height: calc(100vh - 96px);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  border: 1px solid var(--reader-border);
  border-radius: 8px;
  background: var(--reader-card);
  box-shadow:
    var(--reader-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.panel-section {
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
  overflow: hidden;
}

.panel-section.settings-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
  overscroll-behavior: contain;
}

/* NTabs inside reader panel — fill and enable scroll */
.reader-panel :deep(.n-tabs) {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-panel :deep(.n-tabs-nav) {
  flex-shrink: 0;
}

.reader-panel :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.reader-panel :deep(.n-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.panel-section {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  padding: 16px;
  overflow: hidden;
}

.reader-panel :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.reader-panel :deep(.n-tabs-tab-pane) {
  height: 100%;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-head h2 {
  font-size: 1rem;
}

.panel-head span {
  color: var(--reader-muted);
  font-size: 0.86rem;
}

.catalog-list,
.bookmark-list {
  overflow: auto;
  display: grid;
  gap: 6px;
  padding-right: 4px;
}

.catalog-list button,
.bookmark-list article {
  border: 1px solid var(--reader-border);
  border-radius: 8px;
  background: transparent;
}

.catalog-list button {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px;
  color: var(--reader-text);
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.catalog-list button.active {
  border-color: var(--reader-accent);
  background: color-mix(in oklab, var(--reader-accent) 10%, transparent);
}

.catalog-list strong,
.bookmark-list strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-list span,
.bookmark-list span {
  color: var(--reader-muted);
  font-size: 0.82rem;
}

.setting-row {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.setting-divider {
  height: 1px;
  margin: 2px 0;
  background: var(--reader-border);
}

.setting-row span,
.toggle-row span,
.auto-scroll-box span {
  color: var(--reader-muted);
  font-size: 0.88rem;
}

.setting-row > span {
  line-height: 1.35;
}

.setting-row :deep(.n-select),
.setting-row :deep(.n-input) {
  width: 100%;
}

.setting-row :deep(.n-slider) {
  margin: 2px 0 4px;
}

.toggle-row {
  display: flex;
  align-items: center;
  min-height: 32px;
  gap: 10px;
}

.auto-scroll-box {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--reader-border);
  border-radius: 8px;
}

.auto-scroll-box div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.bookmark-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.bookmark-list article > button:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--reader-text);
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.delete-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-right: 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--reader-muted);
  cursor: pointer;
}

.panel-footer {
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--reader-border);
}

.reader-float {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 30;
  display: flex;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--reader-border);
  border-radius: 8px;
  background: var(--reader-card);
  box-shadow:
    var(--reader-shadow),
    0 0 40px rgba(0, 0, 0, 0.04);
  transform: translateX(-50%);
}

.float-btn {
  width: 38px;
  height: 38px;
}

@media (max-width: 980px) {
  .reader-layout {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .reader-panel {
    position: fixed;
    inset: auto 12px 76px 12px;
    z-index: 28;
    max-height: min(72vh, 680px);
  }

  .page-frame {
    padding: 28px 20px 92px;
  }
}

@media (max-width: 620px) {
  .reader-topbar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .reader-top-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .preview-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .reader-pagination {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Naive UI overrides inside reader panel — inherit reader theme */
.reader-panel :deep(.n-tabs-nav) {
  border-bottom-color: var(--reader-border) !important;
  background: var(--reader-card) !important;
}

.reader-panel :deep(.n-tabs-tab) {
  color: var(--reader-muted) !important;
}

.reader-panel :deep(.n-tabs-tab.n-tabs-tab--active) {
  color: var(--reader-accent) !important;
}

.reader-panel :deep(.n-tabs-bar) {
  background: var(--reader-accent) !important;
}

.reader-panel :deep(.n-tabs-tab-pane) {
  color: var(--reader-text);
}

.reader-panel :deep(.n-input) {
  --n-color: var(--reader-surface) !important;
  --n-border: var(--reader-border) !important;
  --n-text-color: var(--reader-text) !important;
  --n-placeholder-color: var(--reader-muted) !important;
}

.reader-panel :deep(.n-input .n-input__input-el) {
  color: var(--reader-text);
}

.reader-panel :deep(.n-input .n-input__placeholder span) {
  color: var(--reader-muted);
}

.reader-panel :deep(.n-select .n-base-selection) {
  --n-color: var(--reader-surface) !important;
  --n-border: var(--reader-border) !important;
  --n-text-color: var(--reader-text) !important;
}

.reader-panel .settings-section :deep(.n-slider .n-slider__fill) {
  background: var(--reader-accent) !important;
}

.reader-panel .settings-section :deep(.n-switch.n-switch--active .n-switch__rail) {
  background: var(--reader-accent) !important;
}

.reader-panel .settings-section :deep(.n-button.n-button--primary-type) {
  --n-color: var(--reader-accent) !important;
  --n-border: var(--reader-accent) !important;
}

.reader-panel :deep(.n-button:not(.n-button--primary-type)) {
  --n-border: var(--reader-border) !important;
  --n-color: var(--reader-surface) !important;
  --n-text-color: var(--reader-text) !important;
}

.reader-float :deep(.n-button) {
  --n-border: var(--reader-border) !important;
  --n-color: var(--reader-card) !important;
  --n-text-color: var(--reader-text) !important;
}

.reader-topbar :deep(.n-button) {
  --n-border: var(--reader-border) !important;
  --n-color: var(--reader-surface) !important;
  --n-text-color: var(--reader-text) !important;
}
</style>
