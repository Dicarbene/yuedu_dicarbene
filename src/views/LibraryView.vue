<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NButtonGroup,
  NInput,
  NSelect,
} from 'naive-ui'
import {
  BookMarked,
  BookOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Wifi,
} from 'lucide-vue-next'
import BookCard from '@/components/BookCard.vue'
import ConnectionDrawer from '@/components/ConnectionDrawer.vue'
import { streamSearchBooks } from '@/lib/api'
import { LIBRARY_SORTERS } from '@/lib/constants'
import {
  chapterProgressPercent,
  unreadChapters,
} from '@/lib/utils'
import { useLegadoStore } from '@/stores/legado'
import { useUiStore } from '@/stores/ui'
import type { Book, SearchBook } from '@/types/legado'

const router = useRouter()
const legado = useLegadoStore()
const ui = useUiStore()

const query = ref('')
const sortBy = ref<(typeof LIBRARY_SORTERS)[number]['value']>('recent')
const searchMode = ref<'shelf' | 'online'>('shelf')
const drawerVisible = ref(false)
const refreshing = ref(false)
let cancelSearch: (() => void) | null = null

const sortOptions = LIBRARY_SORTERS.map((s) => ({
  value: s.value,
  label: s.label,
}))

const statusDot = computed(() => {
  if (legado.connectionStatus === 'ready') return 'ready'
  if (legado.connectionStatus === 'error') return 'error'
  return ''
})

const filteredShelf = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const books = legado.shelf.filter((book) => {
    if (!keyword) return true
    return (
      book.name.toLowerCase().includes(keyword) ||
      book.author.toLowerCase().includes(keyword) ||
      (book.originName ?? '').toLowerCase().includes(keyword) ||
      (book.kind ?? '').toLowerCase().includes(keyword)
    )
  })

  return [...books].sort((a, b) => {
    if (sortBy.value === 'updated') {
      return (b.latestChapterTime || 0) - (a.latestChapterTime || 0)
    }
    if (sortBy.value === 'title') {
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    }
    if (sortBy.value === 'author') {
      return a.author.localeCompare(b.author, 'zh-Hans-CN')
    }
    return (b.durChapterTime || 0) - (a.durChapterTime || 0)
  })
})

const shelfStats = computed(() => {
  const totalUnread = legado.shelf.reduce((sum, book) => sum + unreadChapters(book), 0)
  const progress =
    legado.shelf.length === 0
      ? 0
      : Math.round(
          legado.shelf.reduce(
            (sum, book) =>
              sum +
              chapterProgressPercent(book.durChapterIndex, book.totalChapterNum),
            0,
          ) / legado.shelf.length,
        )
  return {
    total: legado.shelf.length,
    unread: totalUnread,
    progress,
  }
})

const recentBook = computed(() => {
  const recent = legado.recentReading
  if (!recent) return null
  return legado.shelf.find((book) => book.bookUrl === recent.bookUrl) ?? recent
})

async function refreshShelf() {
  refreshing.value = true
  try {
    await legado.refreshShelf()
    ui.pushToast('书架已同步', 'success')
  } catch (error) {
    ui.pushToast(
      '同步失败',
      'error',
      error instanceof Error ? error.message : '无法读取书架',
    )
  } finally {
    refreshing.value = false
  }
}

async function connect(payload: { label: string; httpBase: string }) {
  try {
    await legado.connect(payload.httpBase, payload.label)
    drawerVisible.value = false
    ui.pushToast('连接成功', 'success', legado.connectionMessage)
  } catch (error) {
    ui.pushToast(
      '连接失败',
      'error',
      error instanceof Error ? error.message : '请检查手机 IP 和 Web 服务',
    )
  }
}

function openShelfBook(book: Book) {
  legado.setCurrentBook({
    name: book.name,
    author: book.author,
    bookUrl: book.bookUrl,
    chapterIndex: book.durChapterIndex || 0,
    chapterPos: book.durChapterPos || 0,
    fromShelf: true,
    keepOnShelf: true,
  })
  router.push('/reader')
}

async function previewSearchBook(book: SearchBook) {
  try {
    await legado.ensureBookOnShelf(book)
    legado.setCurrentBook({
      name: book.name,
      author: book.author,
      bookUrl: book.bookUrl,
      chapterIndex: 0,
      chapterPos: 0,
      fromShelf: false,
      keepOnShelf: false,
    })
    router.push('/reader')
  } catch (error) {
    ui.pushToast(
      '试读失败',
      'error',
      error instanceof Error ? error.message : '无法缓存搜索书籍',
    )
  }
}

async function addSearchBook(book: SearchBook) {
  try {
    await legado.ensureBookOnShelf(book)
    await legado.refreshShelf()
    ui.pushToast(`已加入《${book.name}》`, 'success')
  } catch (error) {
    ui.pushToast(
      '加入失败',
      'error',
      error instanceof Error ? error.message : '无法写入 Legado 书架',
    )
  }
}

async function removeShelfBook(book: Book) {
  const ok = window.confirm(`确定从 Legado 书架移出《${book.name}》？`)
  if (!ok) return
  try {
    await legado.removeBook(book)
    ui.pushToast('已移出书架', 'success', book.name)
  } catch (error) {
    ui.pushToast(
      '移出失败',
      'error',
      error instanceof Error ? error.message : '无法删除书籍',
    )
  }
}

function beginOnlineSearch() {
  const keyword = query.value.trim()
  if (!keyword) {
    ui.pushToast('请输入搜索关键词', 'warning')
    return
  }

  cancelSearch?.()
  searchMode.value = 'online'
  legado.searchResults = []
  legado.searchingOnline = true

  cancelSearch = streamSearchBooks(legado.wsBase, keyword, {
    onMessage(items) {
      legado.setSearchResults(items)
    },
    onFinish() {
      legado.searchingOnline = false
      if (legado.searchResults.length === 0) {
        ui.pushToast('没有搜索结果', 'info', keyword)
      }
    },
    onError(message) {
      legado.searchingOnline = false
      ui.pushToast('搜索连接失败', 'error', message)
    },
  })
}

function stopSearch() {
  cancelSearch?.()
  cancelSearch = null
  legado.searchingOnline = false
}

function backToShelf() {
  stopSearch()
  legado.clearSearchResults()
  searchMode.value = 'shelf'
}

function continueRecent() {
  const recent = legado.recentReading
  if (!recent) return
  const shelfBook = legado.shelf.find((book) => book.bookUrl === recent.bookUrl)
  if (shelfBook) {
    openShelfBook(shelfBook)
    return
  }
  legado.setCurrentBook({
    name: recent.name,
    author: recent.author,
    bookUrl: recent.bookUrl,
    chapterIndex: recent.chapterIndex,
    chapterPos: recent.chapterPos,
    fromShelf: false,
    keepOnShelf: !recent.isSearchPreview,
  })
  router.push('/reader')
}

onBeforeUnmount(() => {
  stopSearch()
})
</script>

<template>
  <main class="library-view app-shell">
    <aside class="rail">
      <div class="brand-block">
        <span class="brand-mark">阅</span>
        <div>
          <h1 class="text-gradient">阅渡</h1>
          <p>Legado 局域网书架</p>
        </div>
      </div>

      <NButton
        class="connection-button"
        @click="drawerVisible = true"
      >
        <template #icon>
          <span class="status-dot" :class="statusDot"></span>
        </template>
        <Wifi :size="16" aria-hidden="true" />
        <span class="connection-label">{{ legado.connectionMessage }}</span>
      </NButton>

      <section class="rail-section">
        <h2>概览</h2>
        <div class="metric-grid">
          <div>
            <strong>{{ shelfStats.total }}</strong>
            <span>书籍</span>
          </div>
          <div>
            <strong>{{ shelfStats.unread }}</strong>
            <span>待读章节</span>
          </div>
          <div>
            <strong>{{ shelfStats.progress }}%</strong>
            <span>平均进度</span>
          </div>
        </div>
      </section>

      <section class="rail-section recent-section" v-if="recentBook">
        <h2>最近阅读</h2>
        <button class="recent-card" type="button" @click="continueRecent">
          <BookOpen :size="18" aria-hidden="true" />
          <span>
            <strong>{{ recentBook.name }}</strong>
            <small v-if="'chapterIndex' in recentBook">
              第 {{ recentBook.chapterIndex + 1 }} 章
            </small>
            <small v-else>{{ recentBook.durChapterTitle || '继续阅读' }}</small>
          </span>
        </button>
      </section>

      <section class="rail-section">
        <h2>连接记录</h2>
        <div class="profile-list">
          <button
            v-for="profile in legado.profiles.slice(0, 4)"
            :key="profile.id"
            type="button"
            @click="connect({ label: profile.label, httpBase: profile.httpBase })"
          >
            <strong>{{ profile.label }}</strong>
            <span>{{ profile.httpBase }}</span>
          </button>
        </div>
      </section>
    </aside>

    <section class="workspace">
      <header class="workspace-head">
        <div>
          <p class="kicker">Bookshelf</p>
          <h2 class="section-heading">书架与发现</h2>
        </div>
        <div class="head-actions">
          <NButton
            class="icon-button"
            :disabled="refreshing"
            @click="refreshShelf"
          >
            <template #icon>
              <RefreshCw :size="18" :class="{ spin: refreshing }" aria-hidden="true" />
            </template>
          </NButton>
          <NButton
            class="icon-button"
            @click="drawerVisible = true"
          >
            <template #icon>
              <Settings2 :size="18" aria-hidden="true" />
            </template>
          </NButton>
        </div>
      </header>

      <div class="toolbar glass-panel">
        <NInput
          v-model:value="query"
          type="text"
          placeholder="搜索书名、作者、分类或输入关键词在线搜索"
          @keydown.enter="beginOnlineSearch"
        >
          <template #prefix>
            <Search :size="18" aria-hidden="true" />
          </template>
        </NInput>

        <NSelect
          v-model:value="sortBy"
          :options="sortOptions"
        />

        <NButtonGroup>
          <NButton
            :type="searchMode === 'shelf' ? 'primary' : 'default'"
            @click="backToShelf"
          >
            书架
          </NButton>
          <NButton
            :type="searchMode === 'online' ? 'primary' : 'default'"
            @click="beginOnlineSearch"
          >
            在线
          </NButton>
        </NButtonGroup>
      </div>

      <section class="result-strip" v-if="searchMode === 'online'">
        <div>
          <h3>在线搜索</h3>
          <p>
            {{ legado.searchingOnline ? '正在接收书源返回...' : `共 ${legado.searchResults.length} 条结果` }}
          </p>
        </div>
        <NButton
          v-if="legado.searchingOnline"
          @click="stopSearch"
        >
          停止
        </NButton>
      </section>

      <section class="books-grid" v-if="searchMode === 'shelf'">
        <BookCard
          v-for="book in filteredShelf"
          :key="book.bookUrl"
          :book="book"
          mode="shelf"
          @open="openShelfBook"
          @remove="removeShelfBook"
        />

        <div v-if="filteredShelf.length === 0" class="empty-state">
          <BookMarked :size="34" aria-hidden="true" />
          <h3>{{ query ? '没有匹配的书' : '书架为空' }}</h3>
          <p>可以从阅读 App 添加书籍，或在这里发起在线搜索。</p>
          <NButton type="primary" @click="beginOnlineSearch">
            <template #icon>
              <Plus :size="17" aria-hidden="true" />
            </template>
            在线搜索
          </NButton>
        </div>
      </section>

      <section class="books-grid" v-else>
        <BookCard
          v-for="book in legado.searchResults"
          :key="book.bookUrl"
          :book="book"
          mode="search"
          @preview="previewSearchBook"
          @shelf="addSearchBook"
        />

        <div
          v-if="legado.searchingOnline && legado.searchResults.length === 0"
          class="empty-state"
        >
          <Loader2 class="spin" :size="34" aria-hidden="true" />
          <h3>正在搜索</h3>
          <p>不同书源返回速度不同，结果会陆续出现。</p>
        </div>
      </section>
    </section>

    <ConnectionDrawer
      :visible="drawerVisible"
      :profiles="legado.profiles"
      :current-http-base="legado.httpBase"
      @close="drawerVisible = false"
      @connect="connect"
    />
  </main>
</template>

<style scoped>
.library-view {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  min-height: 100vh;
}

.rail {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  border-right: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(247, 251, 249, 0.88) 0%, rgba(238, 245, 242, 0.84) 100%);
  backdrop-filter: blur(22px);
  box-shadow: 1px 0 40px rgba(20, 43, 41, 0.04);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: #f8fffc;
  background: linear-gradient(135deg, var(--accent), var(--accent-3));
  box-shadow: 0 8px 24px rgba(35, 107, 100, 0.24);
  font-family:
    "Source Han Serif SC",
    "Noto Serif SC",
    serif;
  font-size: 1.35rem;
}

.brand-block h1,
.brand-block p,
.rail-section h2,
.rail-section p,
.workspace-head p,
.workspace-head h2,
.result-strip h3,
.result-strip p {
  margin: 0;
}

.brand-block h1 {
  margin-bottom: 2px;
  font-family:
    "Source Han Serif SC",
    "Noto Serif SC",
    serif;
  font-size: 1.45rem;
}

.brand-block p {
  color: var(--text-2);
  font-size: 0.9rem;
}

.connection-button {
  width: 100%;
  justify-content: flex-start;
}

.connection-label {
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-section {
  display: grid;
  gap: 12px;
}

.rail-section h2 {
  color: var(--text-3);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric-grid div {
  display: grid;
  gap: 4px;
  padding: 14px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 253, 0.72), rgba(250, 254, 251, 0.58));
  transition: border-color 0.22s ease, box-shadow 0.22s ease;
}

.metric-grid div:hover {
  border-color: rgba(35, 107, 100, 0.16);
  box-shadow: 0 4px 12px rgba(20, 43, 41, 0.06);
}

.metric-grid strong {
  font-size: 1.2rem;
}

.metric-grid span,
.profile-list span,
.recent-card small {
  color: var(--text-2);
  font-size: 0.82rem;
}

.recent-card,
.profile-list button {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 253, 0.74), rgba(248, 253, 250, 0.62));
  color: var(--text-1);
  cursor: pointer;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.recent-card:hover,
.profile-list button:hover {
  border-color: rgba(35, 107, 100, 0.2);
  box-shadow: 0 6px 20px rgba(20, 43, 41, 0.08);
  transform: translateY(-1px);
}

.recent-card {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 14px;
  text-align: left;
  font: inherit;
}

.recent-card span,
.profile-list button {
  min-width: 0;
}

.recent-card strong,
.profile-list strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-list {
  display: grid;
  gap: 8px;
}

.profile-list button {
  display: grid;
  gap: 4px;
  padding: 12px;
  text-align: left;
  font: inherit;
}

.profile-list button:hover {
  background: rgba(255, 255, 253, 0.84);
}

.workspace {
  min-width: 0;
  padding: 28px;
}

.workspace-head,
.result-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.kicker {
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.workspace-head h2 {
  margin-top: 4px;
  font-size: 2rem;
}

.head-actions {
  display: flex;
  gap: 10px;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 190px auto;
  gap: 12px;
  align-items: center;
  margin: 22px 0;
  padding: 12px;
}

.result-strip {
  margin-bottom: 18px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}

.result-strip h3 {
  font-size: 1.05rem;
}

.result-strip p {
  margin-top: 3px;
  color: var(--text-2);
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 16px;
  align-items: stretch;
}

.empty-state {
  grid-column: 1 / -1;
  display: grid;
  justify-items: start;
  gap: 12px;
  min-height: 260px;
  padding: 34px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 253, 0.44);
}

.empty-state h3,
.empty-state p {
  margin: 0;
}

.empty-state p {
  color: var(--text-2);
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1040px) {
  .library-view {
    grid-template-columns: 1fr;
  }

  .rail {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
}

@media (max-width: 720px) {
  .rail,
  .workspace {
    padding: 18px;
  }

  .toolbar {
    grid-template-columns: 1fr;
  }

  .workspace-head {
    align-items: start;
  }

  .workspace-head h2 {
    font-size: 1.55rem;
  }
}
</style>
