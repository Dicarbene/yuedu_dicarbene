export type LegadoApiResponse<T> = {
  isSuccess: boolean
  errorMsg: string
  data: T
}

export type BaseBook = {
  name: string
  author: string
  bookUrl: string
  kind?: string | null
  wordCount?: string | null
  variable?: string | null
}

export type Book = BaseBook & {
  tocUrl: string
  origin: string
  originName: string
  customTag?: string | null
  coverUrl?: string | null
  customCoverUrl?: string | null
  intro?: string | null
  charset?: string | null
  type: number
  group: number
  latestChapterTitle?: string | null
  latestChapterTime: number
  lastCheckTime: number
  lastCheckCount: number
  totalChapterNum: number
  durChapterTitle?: string | null
  durChapterIndex: number
  durChapterPos: number
  durChapterTime: number
  canUpdate: boolean
  order: number
  originOrder: number
  syncTime: number
}

export type SearchBook = BaseBook & {
  origin: string
  originName: string
  type: number
  coverUrl?: string | null
  intro?: string | null
  latestChapterTitle?: string | null
  tocUrl: string
  time: number
  originOrder: number
  chapterWordCountText?: string | null
  chapterWordCount?: number
  respondTime: number
}

export type BookChapter = {
  url: string
  title: string
  isVolume: boolean
  baseUrl: string
  bookUrl: string
  index: number
  isVip: boolean
  isPay: boolean
  resourceUrl?: string | null
  tag?: string | null
  wordCount?: string | null
  start?: number | null
  end?: number | null
  startFragmentId?: string | null
  endFragmentId?: string | null
  variable?: string | null
}

export type BookProgress = Pick<
  Book,
  | 'name'
  | 'author'
  | 'durChapterIndex'
  | 'durChapterPos'
  | 'durChapterTime'
  | 'durChapterTitle'
>

export type WebReadConfig = {
  theme: number
  font: number
  fontSize: number
  readWidth: number
  infiniteLoading: boolean
  customFontName: string
  jumpDuration: number
  spacing: {
    paragraph: number
    line: number
    letter: number
  }
}

export type LocalReaderPrefs = {
  autoScrollSpeed: number
  showChapterIndex: boolean
}

export type ConnectionProfile = {
  id: string
  label: string
  httpBase: string
  wsBase: string
  lastUsedAt: number
}

export type RecentReading = {
  name: string
  author: string
  bookUrl: string
  chapterIndex: number
  chapterPos: number
  isSearchPreview?: boolean
}

export type ReaderBookmark = {
  id: string
  bookUrl: string
  chapterIndex: number
  chapterTitle: string
  chapterPos: number
  label: string
  createdAt: number
}

export type ActiveBook = RecentReading & {
  fromShelf: boolean
  keepOnShelf: boolean
}
