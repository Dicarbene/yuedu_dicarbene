import type {
  BaseBook,
  Book,
  BookChapter,
  BookProgress,
  LegadoApiResponse,
  SearchBook,
  WebReadConfig,
} from '@/types/legado'
import {
  deriveWebSocketBase,
  isLegadoAssetPath,
  normalizeHttpBase,
} from '@/lib/utils'

async function parseLegadoResponse<T>(
  response: Response,
): Promise<LegadoApiResponse<T>> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('后端返回的不是 JSON 数据')
  }

  if (
    typeof payload !== 'object' ||
    payload == null ||
    !('isSuccess' in payload) ||
    !('errorMsg' in payload)
  ) {
    throw new Error('后端返回格式不符合 Legado API 约定')
  }

  return payload as LegadoApiResponse<T>
}

async function request<T>(
  httpBase: string,
  path: string,
  init?: RequestInit,
): Promise<LegadoApiResponse<T>> {
  const response = await fetch(new URL(path, normalizeHttpBase(httpBase)), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  return parseLegadoResponse<T>(response)
}

export async function probeConnection(httpBase: string) {
  const normalized = normalizeHttpBase(httpBase)
  try {
    const config = await getReadConfig(normalized)
    return {
      httpBase: normalized,
      wsBase: deriveWebSocketBase(normalized),
      readConfig: config,
    }
  } catch {
    await getBookshelf(normalized)
    return {
      httpBase: normalized,
      wsBase: deriveWebSocketBase(normalized),
      readConfig: undefined,
    }
  }
}

export async function getReadConfig(httpBase: string) {
  const response = await request<string>(httpBase, 'getReadConfig')
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '获取阅读配置失败')
  }
  try {
    return JSON.parse(response.data) as WebReadConfig
  } catch {
    return undefined
  }
}

export async function saveReadConfig(httpBase: string, config: WebReadConfig) {
  const response = await request<string>(httpBase, 'saveReadConfig', {
    method: 'POST',
    body: JSON.stringify(config),
  })
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '保存阅读配置失败')
  }
}

export async function getBookshelf(httpBase: string) {
  const response = await request<Book[]>(httpBase, 'getBookshelf')
  if (!response.isSuccess) {
    if (response.errorMsg.includes('还没有添加小说')) {
      return [] as Book[]
    }
    throw new Error(response.errorMsg || '获取书架失败')
  }
  return response.data
}

export async function getChapterList(httpBase: string, bookUrl: string) {
  const response = await request<BookChapter[]>(
    httpBase,
    `getChapterList?url=${encodeURIComponent(bookUrl)}`,
  )
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '获取目录失败')
  }
  return response.data
}

export async function getBookContent(
  httpBase: string,
  bookUrl: string,
  chapterIndex: number,
) {
  const response = await request<string>(
    httpBase,
    `getBookContent?url=${encodeURIComponent(bookUrl)}&index=${chapterIndex}`,
  )
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '获取正文失败')
  }
  return response.data
}

export async function saveBookProgress(
  httpBase: string,
  progress: BookProgress,
  keepAlive = false,
) {
  const url = new URL('saveBookProgress', normalizeHttpBase(httpBase))
  const body = JSON.stringify(progress)

  if (keepAlive && navigator.sendBeacon) {
    const ok = navigator.sendBeacon(url, body)
    if (ok) return
  }

  const response = await request<string>(httpBase, 'saveBookProgress', {
    method: 'POST',
    body,
    keepalive: keepAlive,
  })
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '保存阅读进度失败')
  }
}

export async function saveBook(httpBase: string, book: BaseBook) {
  const response = await request<string>(httpBase, 'saveBook', {
    method: 'POST',
    body: JSON.stringify(book),
  })
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '加入书架失败')
  }
}

export async function deleteBook(httpBase: string, book: BaseBook) {
  const response = await request<string>(httpBase, 'deleteBook', {
    method: 'POST',
    body: JSON.stringify(book),
  })
  if (!response.isSuccess) {
    throw new Error(response.errorMsg || '删除书籍失败')
  }
}

export function streamSearchBooks(
  wsBase: string,
  keyword: string,
  handlers: {
    onMessage: (items: SearchBook[]) => void
    onFinish: () => void
    onError: (message: string) => void
  },
) {
  let hadError = false
  const socket = new WebSocket(new URL('searchBook', wsBase))
  socket.onerror = () => {
    hadError = true
    handlers.onError('WebSocket 连接失败')
  }
  socket.onopen = () => {
    socket.send(JSON.stringify({ key: keyword }))
  }
  socket.onmessage = event => {
    try {
      handlers.onMessage(JSON.parse(event.data) as SearchBook[])
    } catch {
      handlers.onFinish()
    }
  }
  socket.onclose = () => {
    if (!hadError) {
      handlers.onFinish()
    }
  }
  return () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'cancelled')
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.close()
    }
  }
}

export function buildCoverUrl(httpBase: string, coverPath?: string | null) {
  if (!coverPath) return ''
  if (coverPath.startsWith(normalizeHttpBase(httpBase))) return coverPath
  if (!isLegadoAssetPath(coverPath)) return coverPath
  return new URL(
    `cover?path=${encodeURIComponent(coverPath)}`,
    normalizeHttpBase(httpBase),
  ).toString()
}

export function buildImageUrl(
  httpBase: string,
  bookUrl: string,
  imagePath: string,
  width: number,
) {
  if (imagePath.startsWith(normalizeHttpBase(httpBase))) return imagePath
  if (!isLegadoAssetPath(imagePath)) return imagePath
  return new URL(
    `image?url=${encodeURIComponent(bookUrl)}&path=${encodeURIComponent(imagePath)}&width=${width}`,
    normalizeHttpBase(httpBase),
  ).toString()
}
