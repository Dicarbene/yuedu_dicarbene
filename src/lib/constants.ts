import type {
  LocalReaderPrefs,
  WebReadConfig,
} from '@/types/legado'

export const DEFAULT_HTTP_BASE = 'http://127.0.0.1:1234/'

export const STORAGE_KEYS = {
  profiles: 'legado.lan.profiles',
  activeHttpBase: 'legado.lan.active-http-base',
  readConfig: 'legado.lan.read-config',
  localPrefs: 'legado.lan.local-prefs',
  recentReading: 'legado.lan.recent-reading',
  bookmarks: 'legado.lan.bookmarks',
  activeReader: 'legado.lan.active-reader',
} as const

export const DEFAULT_READ_CONFIG: WebReadConfig = {
  theme: 1,
  font: 0,
  fontSize: 18,
  readWidth: 860,
  infiniteLoading: true,
  customFontName: '',
  jumpDuration: 420,
  spacing: {
    paragraph: 1.05,
    line: 0.9,
    letter: 0,
  },
}

export const DEFAULT_LOCAL_PREFS: LocalReaderPrefs = {
  autoScrollSpeed: 26,
  showChapterIndex: true,
}

export const FONT_PRESETS = [
  {
    id: 0,
    label: '清朗',
    family:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  },
  {
    id: 1,
    label: '宋意',
    family:
      '"Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", serif',
  },
  {
    id: 2,
    label: '楷感',
    family:
      '"STKaiti", "KaiTi", "Kaiti SC", "Source Han Serif SC", serif',
  },
  {
    id: 3,
    label: '霞鹜文楷',
    family: '"LXGW WenKai GB", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 4,
    label: '霞鹜文楷 细',
    family: '"LXGW WenKai GB", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 5,
    label: '霞鹜文楷 中',
    family: '"LXGW WenKai GB", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: 6,
    label: '霞鹜文楷等宽',
    family: '"LXGW WenKai Mono GB", "LXGW WenKai GB", monospace',
  },
  {
    id: 7,
    label: '霞鹜文楷等宽 细',
    family: '"LXGW WenKai Mono GB", "LXGW WenKai GB", monospace',
  },
  {
    id: 8,
    label: '霞鹜文楷等宽 中',
    family: '"LXGW WenKai Mono GB", "LXGW WenKai GB", monospace',
  },
  {
    id: 9,
    label: '霞鹜臻楷',
    family: '"LXGW ZhenKai GB", "STKaiti", "KaiTi", serif',
  },
  {
    id: 10,
    label: '霞鹜新致宋',
    family: '"LXGW Neo ZhiSong Plus", "Source Han Serif SC", "Songti SC", serif',
  },
]

export const READER_THEMES = [
  {
    id: 0,
    label: '书纸',
    shell:
      'radial-gradient(circle at top left, rgba(255,255,255,0.72), transparent 40%), linear-gradient(140deg, #f7f0e4 0%, #eadbc4 100%)',
    page: 'rgba(255, 251, 244, 0.92)',
    surface: 'rgba(255, 248, 238, 0.88)',
    card: 'rgba(255, 250, 243, 0.86)',
    text: '#2d2218',
    muted: '#6c5d4d',
    accent: '#a2682d',
    border: 'rgba(113, 77, 38, 0.18)',
    shadow: '0 24px 70px rgba(83, 55, 22, 0.14)',
  },
  {
    id: 1,
    label: '竹青',
    shell:
      'radial-gradient(circle at top left, rgba(250,255,252,0.8), transparent 36%), linear-gradient(150deg, #eef4ea 0%, #dbe5d5 100%)',
    page: 'rgba(249, 253, 247, 0.92)',
    surface: 'rgba(243, 249, 240, 0.88)',
    card: 'rgba(250, 254, 248, 0.84)',
    text: '#243128',
    muted: '#55675a',
    accent: '#457057',
    border: 'rgba(58, 91, 69, 0.16)',
    shadow: '0 24px 70px rgba(41, 65, 49, 0.12)',
  },
  {
    id: 2,
    label: '湖墨',
    shell:
      'radial-gradient(circle at top left, rgba(255,255,255,0.65), transparent 35%), linear-gradient(150deg, #ebf2f5 0%, #d7e1e7 100%)',
    page: 'rgba(251, 253, 255, 0.92)',
    surface: 'rgba(244, 248, 250, 0.88)',
    card: 'rgba(252, 254, 255, 0.84)',
    text: '#1f2a33',
    muted: '#5a6a77',
    accent: '#3a6784',
    border: 'rgba(51, 84, 104, 0.15)',
    shadow: '0 24px 70px rgba(49, 76, 92, 0.12)',
  },
  {
    id: 3,
    label: '绛纱',
    shell:
      'radial-gradient(circle at top left, rgba(255,255,255,0.68), transparent 34%), linear-gradient(160deg, #f8efef 0%, #edd9d8 100%)',
    page: 'rgba(255, 250, 249, 0.92)',
    surface: 'rgba(251, 244, 244, 0.88)',
    card: 'rgba(255, 250, 250, 0.86)',
    text: '#342223',
    muted: '#745a5f',
    accent: '#a15159',
    border: 'rgba(118, 61, 69, 0.16)',
    shadow: '0 24px 70px rgba(114, 61, 69, 0.12)',
  },
  {
    id: 4,
    label: '雾灰',
    shell:
      'radial-gradient(circle at top left, rgba(255,255,255,0.62), transparent 34%), linear-gradient(160deg, #f0efec 0%, #dddad5 100%)',
    page: 'rgba(251, 251, 249, 0.92)',
    surface: 'rgba(245, 244, 241, 0.88)',
    card: 'rgba(252, 251, 249, 0.86)',
    text: '#2b2b29',
    muted: '#61615d',
    accent: '#6c655c',
    border: 'rgba(94, 93, 89, 0.16)',
    shadow: '0 24px 70px rgba(70, 70, 65, 0.1)',
  },
  {
    id: 5,
    label: '暮石',
    shell:
      'radial-gradient(circle at top left, rgba(82,96,112,0.4), transparent 32%), linear-gradient(160deg, #2b3640 0%, #141b20 100%)',
    page: 'rgba(24, 31, 37, 0.92)',
    surface: 'rgba(29, 38, 45, 0.86)',
    card: 'rgba(35, 45, 53, 0.88)',
    text: '#edf1f4',
    muted: '#9ba8b1',
    accent: '#7fc3d6',
    border: 'rgba(139, 173, 187, 0.16)',
    shadow: '0 24px 70px rgba(7, 10, 13, 0.32)',
  },
  {
    id: 6,
    label: '夜航',
    shell:
      'radial-gradient(circle at top left, rgba(72,88,128,0.46), transparent 34%), linear-gradient(170deg, #181b27 0%, #0a0b10 100%)',
    page: 'rgba(16, 18, 25, 0.94)',
    surface: 'rgba(22, 25, 34, 0.9)',
    card: 'rgba(29, 34, 45, 0.88)',
    text: '#e7edf9',
    muted: '#97a4bf',
    accent: '#d7a86e',
    border: 'rgba(133, 150, 189, 0.18)',
    shadow: '0 24px 70px rgba(1, 2, 5, 0.46)',
  },
] as const

export const LIBRARY_SORTERS = [
  { value: 'recent', label: '最近阅读' },
  { value: 'updated', label: '最近更新' },
  { value: 'title', label: '书名 A-Z' },
  { value: 'author', label: '作者 A-Z' },
] as const
