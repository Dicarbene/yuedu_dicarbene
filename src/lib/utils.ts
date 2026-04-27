import { DEFAULT_HTTP_BASE } from '@/lib/constants'
import type { Book, SearchBook } from '@/types/legado'

export function isBlank(value: string | null | undefined) {
  return value == null || value.trim().length === 0
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function formatRelativeTime(timestamp: number) {
  const now = Date.now()
  const delta = Math.floor((now - timestamp) / 1000)
  if (!Number.isFinite(delta) || delta < 0) return '未知'
  if (delta <= 30) return '刚刚'
  if (delta < 60) return `${delta} 秒前`
  if (delta < 3600) return `${Math.floor(delta / 60)} 分钟前`
  if (delta < 86400) return `${Math.floor(delta / 3600)} 小时前`
  if (delta < 2592000) return `${Math.floor(delta / 86400)} 天前`
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

export function normalizeHttpBase(input?: string) {
  const raw = isBlank(input) ? DEFAULT_HTTP_BASE : input!.trim()
  const url = new URL(raw)
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url.toString()
}

export function deriveWebSocketBase(httpBase: string) {
  const httpUrl = new URL(normalizeHttpBase(httpBase))
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  httpUrl.port = httpUrl.port === '' ? '' : String(Number(httpUrl.port) + 1)
  return httpUrl.toString()
}

export function isLegadoAssetPath(value: string) {
  return /,\s*\{/.test(value) || !/^(https?:|data:|blob:)/i.test(value)
}

export function chapterProgressPercent(
  currentIndex: number,
  totalChapterNum: number,
) {
  if (totalChapterNum <= 0) return 0
  return Math.round(((currentIndex + 1) / totalChapterNum) * 100)
}

export function unreadChapters(book: Book) {
  return Math.max(book.totalChapterNum - book.durChapterIndex - 1, 0)
}

export function bookIsSearchResult(book: Book | SearchBook): book is SearchBook {
  return 'respondTime' in book
}


