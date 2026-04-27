<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NProgress, NTag } from 'naive-ui'
import { BookOpen, Eye, Plus, Trash2 } from 'lucide-vue-next'
import { useLegadoStore } from '@/stores/legado'
import type { Book, SearchBook } from '@/types/legado'
import {
  bookIsSearchResult,
  chapterProgressPercent,
  formatRelativeTime,
  unreadChapters,
} from '@/lib/utils'

const props = defineProps<{
  book: Book | SearchBook
  mode: 'shelf' | 'search'
}>()

const emit = defineEmits<{
  open: [book: Book]
  remove: [book: Book]
  preview: [book: SearchBook]
  shelf: [book: SearchBook]
}>()

const legado = useLegadoStore()
const isSearchMode = computed(() => props.mode === 'search')
const coverUrl = computed(() => legado.getCoverUrl(props.book.coverUrl))
const searchTags = computed(() =>
  (props.book.kind ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3),
)
const progress = computed(() => {
  if (bookIsSearchResult(props.book)) return 0
  return chapterProgressPercent(
    props.book.durChapterIndex,
    props.book.totalChapterNum,
  )
})
const footerLine = computed(() => {
  if (bookIsSearchResult(props.book)) {
    return props.book.intro?.trim() || '该搜索结果未提供简介。'
  }
  const latest = props.book.latestChapterTitle?.trim()
  const current = props.book.durChapterTitle?.trim()
  if (latest && current && latest !== current) {
    return `最新：${latest}`
  }
  return latest || current || '尚未同步章节标题'
})
</script>

<template>
  <article class="book-card glass-panel">
    <div class="book-cover">
      <img v-if="coverUrl" :src="coverUrl" :alt="book.name" loading="lazy" />
      <div v-else class="cover-fallback">
        <span>{{ book.name.slice(0, 1) || '书' }}</span>
      </div>
      <div class="book-flags">
        <span class="flag flag-source">{{ book.originName || '默认源' }}</span>
        <span
          v-if="!bookIsSearchResult(book) && unreadChapters(book) > 0"
          class="flag flag-update"
        >
          {{ unreadChapters(book) }} 章待读
        </span>
      </div>
    </div>

    <div class="book-copy">
      <header class="book-header">
        <div>
          <h3>{{ book.name }}</h3>
          <p>{{ book.author || '佚名' }}</p>
        </div>
        <span v-if="!bookIsSearchResult(book)" class="book-meta">
          {{ formatRelativeTime(book.lastCheckTime) }}
        </span>
      </header>

      <div class="book-tags" v-if="isSearchMode && searchTags.length > 0">
        <NTag v-for="tag in searchTags" :key="tag" bordered>{{ tag }}</NTag>
      </div>

      <div v-if="!bookIsSearchResult(book)" class="progress-band">
        <NProgress
          type="line"
          :percentage="progress"
          :show-indicator="false"
          :height="8"
          :border-radius="8"
          :fill-border-radius="8"
          processing
        />
        <div class="progress-meta">
          <span>{{ progress }}%</span>
          <span>{{ book.durChapterIndex + 1 }} / {{ book.totalChapterNum }}</span>
        </div>
      </div>

      <p class="book-brief">{{ footerLine }}</p>

      <footer class="book-actions">
        <template v-if="isSearchMode && bookIsSearchResult(book)">
          <NButton @click.stop="emit('preview', book)">
            <template #icon>
              <Eye :size="17" aria-hidden="true" />
            </template>
            试读
          </NButton>
          <NButton type="primary" @click.stop="emit('shelf', book)">
            <template #icon>
              <Plus :size="17" aria-hidden="true" />
            </template>
            加入书架
          </NButton>
        </template>
        <template v-else-if="!bookIsSearchResult(book)">
          <NButton type="primary" @click.stop="emit('open', book)">
            <template #icon>
              <BookOpen :size="17" aria-hidden="true" />
            </template>
            继续阅读
          </NButton>
          <NButton @click.stop="emit('remove', book)" :bordered="true">
            <template #icon>
              <Trash2 :size="17" aria-hidden="true" />
            </template>
            移出
          </NButton>
        </template>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.book-card {
  display: grid;
  grid-template-columns: 122px minmax(0, 1fr);
  gap: 22px;
  min-height: 286px;
  padding: 20px;
  border-radius: 8px;
  transition:
    transform 0.26s ease,
    box-shadow 0.26s ease,
    border-color 0.26s ease;
}

.book-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 44px rgba(20, 43, 41, 0.14), 0 0 0 1px rgba(35, 107, 100, 0.14);
  border-color: rgba(35, 107, 100, 0.24);
}

.book-cover {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  background:
    linear-gradient(165deg, #dae8e3 0%, #bfd2d4 40%, #c5d0d8 100%);
  box-shadow: 0 8px 24px rgba(20, 43, 41, 0.1);
}

.book-cover img,
.cover-fallback {
  width: 100%;
  height: 100%;
}

.book-cover img {
  object-fit: cover;
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: rgba(26, 50, 48, 0.52);
  font-family:
    "Source Han Serif SC",
    "Noto Serif SC",
    serif;
  font-size: 2.2rem;
  background:
    linear-gradient(155deg, #f6faf8, #e8f2f0 50%, #dce9e8);
}

.book-flags {
  position: absolute;
  inset: 12px 12px auto 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flag {
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  backdrop-filter: blur(14px);
}

.flag-source {
  color: #f8fffc;
  background: rgba(23, 33, 31, 0.66);
}

.flag-update {
  color: #184f48;
  background: rgba(239, 250, 247, 0.94);
}

.book-copy {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 14px;
  min-width: 0;
}

.book-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.book-header h3 {
  margin: 0 0 4px;
  font-family:
    "Source Han Serif SC",
    "Noto Serif SC",
    serif;
  font-size: 1.24rem;
  line-height: 1.2;
}

.book-header p,
.book-meta {
  margin: 0;
  color: var(--text-2);
  font-size: 0.92rem;
}

.book-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.progress-band {
  display: grid;
  gap: 8px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-2);
  font-size: 0.85rem;
}

.book-brief {
  margin: 0;
  color: var(--text-2);
  line-height: 1.72;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.book-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 720px) {
  .book-card {
    grid-template-columns: 96px minmax(0, 1fr);
    min-height: auto;
    padding: 16px;
    gap: 16px;
  }

  .book-header {
    flex-direction: column;
  }

  .book-brief {
    -webkit-line-clamp: 3;
  }
}
</style>
