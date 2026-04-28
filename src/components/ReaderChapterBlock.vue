<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useLegadoStore } from '@/stores/legado'
import {
  isStandaloneImageHtml,
  paragraphReadLength,
  transformParagraphHtml,
} from '@/lib/content'
import type { WebReadConfig } from '@/types/legado'

const props = defineProps<{
  catalogIndex: number
  title: string
  paragraphs: string[]
  fontFamily: string
  fontSize: number
  showChapterIndex: boolean
  spacing: WebReadConfig['spacing']
  displayWidth: number
}>()

const emit = defineEmits<{
  progress: [catalogIndex: number, chapterPos: number]
}>()

const legado = useLegadoStore()
const paragraphNodes = ref<HTMLElement[]>([])
const titleNode = ref<HTMLElement>()
const zoomedSrc = ref<string | null>(null)
let dismissZoom: (() => void) | null = null
let skipNextClick = false

const paragraphOffsets = computed(() => {
  let current = -1
  return props.paragraphs.map(paragraph => {
    current += paragraphReadLength(paragraph) + 1
    return current
  })
})

function resolveImage(src: string, width: number) {
  const bookUrl = legado.currentBook?.bookUrl ?? ''
  return legado.getImageUrl(bookUrl, src, width)
}

function renderParagraph(paragraph: string) {
  return transformParagraphHtml(paragraph, resolveImage, props.displayWidth)
}

function repairImage(event: Event) {
  const target = event.target as HTMLImageElement | null
  if (!target) return
  const source =
    target.dataset.originSrc ??
    target.getAttribute('data-origin-src') ??
    target.getAttribute('src') ??
    ''
  if (!source) return
  target.src = resolveImage(source, props.displayWidth)
}

function handleImageClick(event: MouseEvent) {
  const img = (event.target as HTMLElement).closest('img') as HTMLImageElement | null
  if (!img) return
  event.stopPropagation()

  if (skipNextClick) {
    skipNextClick = false
    return
  }

  const isZoomed = img.classList.contains('zoomed')

  if (isZoomed) {
    img.classList.remove('zoomed')
    zoomedSrc.value = null
    if (dismissZoom) {
      document.removeEventListener('click', dismissZoom, true)
      dismissZoom = null
    }
    return
  }

  document.querySelectorAll('.reader-paragraph img.zoomed').forEach(el => el.classList.remove('zoomed'))

  img.classList.add('zoomed')
  zoomedSrc.value = img.src

  if (dismissZoom) {
    document.removeEventListener('click', dismissZoom, true)
  }
  const handler = () => {
    skipNextClick = true
    img.classList.remove('zoomed')
    zoomedSrc.value = null
    document.removeEventListener('click', handler, true)
    dismissZoom = null
  }
  dismissZoom = handler
  requestAnimationFrame(() => {
    document.addEventListener('click', handler, true)
  })
}

let observer: IntersectionObserver | null = null
let observeResize: (() => void) | null = null
let resizeTimer = 0

onMounted(() => {
  createObserver()

  observeResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(recreateObserver, 160)
  }
  window.addEventListener('resize', observeResize, { passive: true })
})

function createObserver() {
  observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const chapterPos = Number(
          (entry.target as HTMLElement).dataset.chapterpos ?? '0',
        )
        emit('progress', props.catalogIndex, chapterPos)
      })
    },
    {
      rootMargin: `0px 0px -${Math.max(window.innerHeight - 80, 120)}px 0px`,
    },
  )

  if (titleNode.value) observer.observe(titleNode.value)
  paragraphNodes.value.forEach(node => observer?.observe(node))
}

function recreateObserver() {
  observer?.disconnect()
  createObserver()
}

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  if (observeResize) {
    window.removeEventListener('resize', observeResize)
    observeResize = null
  }
  window.clearTimeout(resizeTimer)
  if (dismissZoom) {
    dismissZoom()
    dismissZoom = null
  }
})

function scrollToReadedLength(length: number) {
  if (length <= 0) return
  const targetIndex = paragraphOffsets.value.findIndex(offset => offset >= length)
  if (targetIndex < 0) return
  nextTick(() => {
    paragraphNodes.value[targetIndex]?.scrollIntoView({
      block: 'start',
      behavior: 'auto',
    })
  })
}

defineExpose({
  scrollToReadedLength,
})
</script>

<template>
  <section class="reader-block">
    <header
      ref="titleNode"
      class="reader-block-head"
      data-chapterpos="0"
    >
      <span v-if="showChapterIndex" class="chapter-count">
        {{ catalogIndex + 1 }}
      </span>
      <h2>{{ title }}</h2>
    </header>

    <div
      v-for="(paragraph, index) in paragraphs"
      :key="`${catalogIndex}-${index}`"
      ref="paragraphNodes"
      class="reader-paragraph-wrap"
      :data-chapterpos="paragraphOffsets[index]"
    >
      <p
        class="reader-paragraph"
        :class="{ 'is-standalone-image': isStandaloneImageHtml(paragraph) }"
        :style="{
          fontFamily,
          fontSize: `${fontSize}px`,
          letterSpacing: `${spacing.letter}em`,
          lineHeight: `calc(1 + ${spacing.line})`,
          margin: `${spacing.paragraph}em 0`,
        }"
        v-html="renderParagraph(paragraph)"
        @click="handleImageClick"
        @error.capture="repairImage"
      />
    </div>
  </section>
</template>

<style scoped>
.reader-block + .reader-block {
  margin-top: 60px;
}

.reader-block {
  content-visibility: auto;
  contain-intrinsic-size: 900px;
}

.reader-block-head {
  display: grid;
  gap: 8px;
  margin-bottom: 26px;
}

.chapter-count {
  color: var(--reader-muted);
  font-size: 0.9rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.reader-block-head h2 {
  margin: 0;
  font-family:
    "Source Han Serif SC",
    "Noto Serif SC",
    serif;
  font-size: clamp(1.6rem, 1.2rem + 1vw, 2.25rem);
  line-height: 1.2;
  color: var(--reader-text);
}

.reader-paragraph-wrap {
  color: var(--reader-text);
}

.reader-paragraph {
  margin: 0;
  word-break: break-word;
  color: var(--reader-text);
}

.reader-paragraph :deep(a) {
  color: var(--reader-accent);
}

/* inline images (badges, emojis, comment marks) */
.reader-paragraph :deep(img) {
  height: 1em;
  width: auto;
  display: inline;
  vertical-align: text-bottom;
  cursor: zoom-in;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  border-radius: 3px;
}

.reader-paragraph :deep(img):hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* standalone image paragraphs (illustrations) */
.reader-paragraph.is-standalone-image {
  margin: 24px 0;
  text-align: center;
}

.reader-paragraph.is-standalone-image :deep(img) {
  height: auto;
  max-height: 70vh;
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 24px 60px rgba(20, 19, 16, 0.16);
}

/* zoomed-in state */
.reader-paragraph :deep(img.zoomed) {
  height: auto !important;
  max-height: 80vh;
  max-width: 100%;
  display: block;
  margin: 14px auto;
  cursor: zoom-out;
  box-shadow: 0 18px 44px rgba(20, 19, 16, 0.22);
  border-radius: 8px;
}
</style>
