# 阅渡：Legado 局域网 Web 阅读器

这是一个面向 [gedoor/legado](https://github.com/gedoor/legado) Web 服务的 Vue 3 前端。手机端阅读 App 开启 Web 服务后，本项目可以在同一局域网内连接手机暴露的 API，读取书架、搜索在线书籍并阅读正文。

## 技术栈

| 类别 | 方案 |
|------|------|
| 框架 | Vue 3 (Composition API + `<script setup lang="ts">`) |
| 语言 | TypeScript (strict mode) |
| 构建 | Vite |
| 路由 | vue-router (hash 模式) |
| 状态管理 | Pinia |
| UI 组件库 | Naive UI (全局主题定制) |
| 图标 | lucide-vue-next |
| 样式 | CSS 自定义属性 + Naive UI 主题覆盖 |

Naive UI 通过 `themeOverrides` 将组件色彩、圆角、字号、间距等映射到项目原有的 frosted glass 设计体系，替换了手写按钮、输入框、选择器、滑块、进度条、标签、抽屉、标签页、开关等组件。

## 功能

- 连接 Legado HTTP/WebSocket API，支持记录多个局域网设备地址。
- 读取 App 书架，按最近阅读、最近更新、书名、作者排序。
- 本地过滤书架，并通过 `ws://<host>:<port+1>/searchBook` 在线搜索书籍。
- 搜索结果可试读或直接加入 Legado 书架。
- 阅读器支持目录搜索、上一章/下一章、键盘翻页、无限加载、正文图片代理。
- 阅读设置支持主题、字体、字号、阅读宽度、行距、无限加载、自动滚动。
- 阅读进度会写回 `saveBookProgress`，关闭或切换页面时使用 keep-alive/beacon 同步。
- 本地书签按书籍保存，可快速跳回章节。

## Legado 端准备

1. 手机和电脑连接同一个局域网。
2. 在阅读 App 中启用 Web 服务。
3. 记下手机 IP 和 Web 服务端口，例如 `http://192.168.1.23:1234/`。
4. 在线搜索依赖 WebSocket 端口，通常为 HTTP 端口加 1，例如 `1235`。

## 开发

```bash
npm install
npm run dev
```

打开 Vite 输出的地址后，点击左侧连接状态，填入阅读 App 的 HTTP 地址。

全局主题定义在 `src/theme.ts`，通过 Naive UI 的 `GlobalThemeOverrides` 控制所有组件的外观。CSS 变量索引见 `src/style.css :root`。阅读器七套主题配置在 `src/lib/constants.ts`。

## 构建

```bash
npm run build
```

构建产物在 `dist/`。因为 `vite.config.ts` 设置了 `base: './'`，静态文件可以部署到普通静态服务器或复制到任意子路径。

## API 依据

项目使用 Legado 官方文档中的 Web API：

- `GET /getReadConfig`
- `POST /saveReadConfig`
- `GET /getBookshelf`
- `GET /getChapterList?url=...`
- `GET /getBookContent?url=...&index=...`
- `POST /saveBook`
- `POST /deleteBook`
- `POST /saveBookProgress`
- `GET /cover?path=...`
- `GET /image?url=...&path=...&width=...`
- `WebSocket /searchBook`
