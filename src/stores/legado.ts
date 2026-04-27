import { defineStore } from 'pinia'
import {
  buildCoverUrl,
  buildImageUrl,
  deleteBook,
  getBookContent,
  getBookshelf,
  getChapterList,
  getReadConfig,
  probeConnection,
  saveBook,
  saveBookProgress,
  saveReadConfig,
} from '@/lib/api'
import {
  DEFAULT_HTTP_BASE,
  DEFAULT_LOCAL_PREFS,
  DEFAULT_READ_CONFIG,
  STORAGE_KEYS,
} from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage'
import {
  deriveWebSocketBase,
  normalizeHttpBase,
  uid,
} from '@/lib/utils'
import type {
  ActiveBook,
  BaseBook,
  Book,
  BookChapter,
  BookProgress,
  ConnectionProfile,
  LocalReaderPrefs,
  ReaderBookmark,
  RecentReading,
  SearchBook,
  WebReadConfig,
} from '@/types/legado'

const chapterCache = new Map<string, string[]>()

function loadReaderSnapshot() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.activeReader)
    if (raw == null) return null
    return JSON.parse(raw) as ActiveBook
  } catch {
    return null
  }
}

function saveReaderSnapshot(book: ActiveBook | null) {
  if (book == null) {
    sessionStorage.removeItem(STORAGE_KEYS.activeReader)
    return
  }
  sessionStorage.setItem(STORAGE_KEYS.activeReader, JSON.stringify(book))
}

export const useLegadoStore = defineStore('legado', {
  state: () => {
    const activeHttpBase = normalizeHttpBase(
      readStorage(STORAGE_KEYS.activeHttpBase, DEFAULT_HTTP_BASE),
    )
    return {
      connectionStatus: 'idle' as 'idle' | 'connecting' | 'ready' | 'error',
      connectionMessage: '等待连接 Legado Web 服务',
      httpBase: activeHttpBase,
      wsBase: deriveWebSocketBase(activeHttpBase),
      profiles: readStorage<ConnectionProfile[]>(STORAGE_KEYS.profiles, []),
      shelf: [] as Book[],
      searchResults: [] as SearchBook[],
      searchingOnline: false,
      catalog: [] as BookChapter[],
      currentBook: loadReaderSnapshot() as ActiveBook | null,
      recentReading: readStorage<RecentReading | null>(
        STORAGE_KEYS.recentReading,
        null,
      ),
      readConfig: Object.assign(
        {},
        DEFAULT_READ_CONFIG,
        readStorage<WebReadConfig>(STORAGE_KEYS.readConfig, DEFAULT_READ_CONFIG),
      ),
      localPrefs: Object.assign(
        {},
        DEFAULT_LOCAL_PREFS,
        readStorage<LocalReaderPrefs>(
          STORAGE_KEYS.localPrefs,
          DEFAULT_LOCAL_PREFS,
        ),
      ),
      bookmarks: readStorage<Record<string, ReaderBookmark[]>>(
        STORAGE_KEYS.bookmarks,
        {},
      ),
    }
  },
  getters: {
    activeThemeIndex: state => state.readConfig.theme,
    currentBookmarks: state => {
      if (!state.currentBook) return [] as ReaderBookmark[]
      return state.bookmarks[state.currentBook.bookUrl] ?? []
    },
    bookProgress(state): BookProgress | null {
      if (!state.currentBook) return null
      const chapter = state.catalog[state.currentBook.chapterIndex]
      if (!chapter) return null
      return {
        name: state.currentBook.name,
        author: state.currentBook.author,
        durChapterIndex: state.currentBook.chapterIndex,
        durChapterPos: state.currentBook.chapterPos,
        durChapterTime: Date.now(),
        durChapterTitle: chapter.title,
      }
    },
  },
  actions: {
    getCoverUrl(coverPath?: string | null) {
      return buildCoverUrl(this.httpBase, coverPath)
    },
    getImageUrl(bookUrl: string, imagePath: string, width: number) {
      return buildImageUrl(this.httpBase, bookUrl, imagePath, width)
    },
    persistConfig() {
      writeStorage(STORAGE_KEYS.readConfig, this.readConfig)
    },
    persistLocalPrefs() {
      writeStorage(STORAGE_KEYS.localPrefs, this.localPrefs)
    },
    persistProfiles() {
      writeStorage(STORAGE_KEYS.profiles, this.profiles)
      writeStorage(STORAGE_KEYS.activeHttpBase, this.httpBase)
    },
    persistRecent() {
      writeStorage(STORAGE_KEYS.recentReading, this.recentReading)
    },
    persistBookmarks() {
      writeStorage(STORAGE_KEYS.bookmarks, this.bookmarks)
    },
    setConnectionState(
      status: 'idle' | 'connecting' | 'ready' | 'error',
      message: string,
    ) {
      this.connectionStatus = status
      this.connectionMessage = message
    },
    upsertProfile(label: string, httpBase: string, wsBase: string) {
      const normalized = normalizeHttpBase(httpBase)
      const profile: ConnectionProfile = {
        id: uid('profile'),
        label,
        httpBase: normalized,
        wsBase,
        lastUsedAt: Date.now(),
      }

      const existingIndex = this.profiles.findIndex(
        item => item.httpBase === normalized,
      )
      if (existingIndex >= 0) {
        this.profiles[existingIndex] = {
          ...this.profiles[existingIndex],
          ...profile,
          id: this.profiles[existingIndex].id,
        }
      } else {
        this.profiles.unshift(profile)
      }

      this.profiles = [...this.profiles].sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      this.persistProfiles()
    },
    async connect(httpBase: string, label = '当前设备') {
      this.setConnectionState('connecting', '正在校验 Legado 接口...')
      const result = await probeConnection(httpBase)
      this.httpBase = result.httpBase
      this.wsBase = result.wsBase
      if (result.readConfig) {
        this.readConfig = Object.assign({}, DEFAULT_READ_CONFIG, result.readConfig)
        this.persistConfig()
      } else {
        try {
          const config = await getReadConfig(this.httpBase)
          if (config) {
            this.readConfig = Object.assign({}, DEFAULT_READ_CONFIG, config)
            this.persistConfig()
          }
        } catch {
          // The API is optional on older servers.
        }
      }
      this.upsertProfile(label, this.httpBase, this.wsBase)
      this.setConnectionState('ready', `已连接 ${new URL(this.httpBase).host}`)
      await this.refreshShelf()
    },
    async refreshShelf() {
      const books = await getBookshelf(this.httpBase)
      this.shelf = [...books].sort((a, b) => {
        const left = a.durChapterTime || 0
        const right = b.durChapterTime || 0
        return right - left
      })
      return this.shelf
    },
    setSearchResults(items: SearchBook[]) {
      const seen = new Set(this.searchResults.map(item => item.bookUrl))
      items.forEach(item => {
        if (!seen.has(item.bookUrl)) {
          this.searchResults.push(item)
          seen.add(item.bookUrl)
        }
      })
    },
    clearSearchResults() {
      this.searchResults = []
      this.searchingOnline = false
    },
    async ensureBookOnShelf(book: BaseBook) {
      const exists = this.shelf.some(item => item.bookUrl === book.bookUrl)
      if (!exists) {
        await saveBook(this.httpBase, book)
      }
    },
    setCurrentBook(book: ActiveBook | null) {
      this.currentBook = book
      saveReaderSnapshot(book)
      if (book) {
        this.recentReading = {
          name: book.name,
          author: book.author,
          bookUrl: book.bookUrl,
          chapterIndex: book.chapterIndex,
          chapterPos: book.chapterPos,
          isSearchPreview: !book.keepOnShelf,
        }
        this.persistRecent()
      }
    },
    async loadCatalog(book: ActiveBook) {
      const catalog = await getChapterList(this.httpBase, book.bookUrl)
      this.catalog = catalog
      return catalog
    },
    clearCatalog() {
      this.catalog = []
    },
    updateProgress(chapterIndex: number, chapterPos: number) {
      if (!this.currentBook) return
      this.currentBook = {
        ...this.currentBook,
        chapterIndex,
        chapterPos,
      }
      this.recentReading = {
        name: this.currentBook.name,
        author: this.currentBook.author,
        bookUrl: this.currentBook.bookUrl,
        chapterIndex,
        chapterPos,
        isSearchPreview: !this.currentBook.keepOnShelf,
      }
      saveReaderSnapshot(this.currentBook)
      this.persistRecent()

      const shelfIndex = this.shelf.findIndex(
        item => item.bookUrl === this.currentBook?.bookUrl,
      )
      const chapter = this.catalog[chapterIndex]
      if (shelfIndex >= 0 && chapter) {
        this.shelf[shelfIndex] = {
          ...this.shelf[shelfIndex],
          durChapterIndex: chapterIndex,
          durChapterPos: chapterPos,
          durChapterTitle: chapter.title,
          durChapterTime: Date.now(),
        }
      }
    },
    async loadChapterParagraphs(bookUrl: string, chapterIndex: number) {
      const cacheKey = `${bookUrl}::${chapterIndex}`
      const cached = chapterCache.get(cacheKey)
      if (cached) return cached
      const content = await getBookContent(this.httpBase, bookUrl, chapterIndex)
      const paragraphs = content.split(/\n+/).filter(Boolean)
      chapterCache.set(cacheKey, paragraphs.length > 0 ? paragraphs : [''])
      return chapterCache.get(cacheKey)!
    },
    async syncProgress(keepAlive = false) {
      if (!this.bookProgress) return
      await saveBookProgress(this.httpBase, this.bookProgress, keepAlive)
    },
    async updateReadConfig(
      nextConfig: Partial<Omit<WebReadConfig, 'spacing'>> & {
        spacing?: Partial<WebReadConfig['spacing']>
      },
      sync = true,
    ) {
      this.readConfig = {
        ...this.readConfig,
        ...nextConfig,
        spacing: {
          ...this.readConfig.spacing,
          ...(nextConfig.spacing ?? {}),
        },
      }
      this.persistConfig()
      if (sync) {
        try {
          await saveReadConfig(this.httpBase, this.readConfig)
        } catch {
          // Some Legado builds may not expose this endpoint.
        }
      }
    },
    updateLocalPrefs(nextPrefs: Partial<LocalReaderPrefs>) {
      this.localPrefs = {
        ...this.localPrefs,
        ...nextPrefs,
      }
      this.persistLocalPrefs()
    },
    addBookmark(partial: Omit<ReaderBookmark, 'id' | 'createdAt'>) {
      const item: ReaderBookmark = {
        ...partial,
        id: uid('mark'),
        createdAt: Date.now(),
      }
      const current = this.bookmarks[partial.bookUrl] ?? []
      this.bookmarks = {
        ...this.bookmarks,
        [partial.bookUrl]: [item, ...current],
      }
      this.persistBookmarks()
      return item
    },
    removeBookmark(bookUrl: string, bookmarkId: string) {
      this.bookmarks = {
        ...this.bookmarks,
        [bookUrl]: (this.bookmarks[bookUrl] ?? []).filter(
          item => item.id !== bookmarkId,
        ),
      }
      this.persistBookmarks()
    },
    async removeBook(book: BaseBook) {
      await deleteBook(this.httpBase, book)
      this.shelf = this.shelf.filter(item => item.bookUrl !== book.bookUrl)
    },
    markCurrentBookKept() {
      if (!this.currentBook) return
      this.currentBook = {
        ...this.currentBook,
        keepOnShelf: true,
      }
      saveReaderSnapshot(this.currentBook)
    },
    async cleanupPreviewBook() {
      if (!this.currentBook || this.currentBook.keepOnShelf) return
      await deleteBook(this.httpBase, this.currentBook)
      this.shelf = this.shelf.filter(
        item => item.bookUrl !== this.currentBook?.bookUrl,
      )
    },
  },
})
