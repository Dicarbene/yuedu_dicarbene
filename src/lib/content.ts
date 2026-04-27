import { isLegadoAssetPath } from '@/lib/utils'

const INLINE_IMAGE_PATTERN =
  /<img[^>]*src=['"]([^'"]*(?:['"][^>]+\})?)['"][^>]*>/gi

export function isStandaloneImageHtml(content: string) {
  return /^\s*<img[^>]*src=['"][^'"]+['"][^>]*>\s*$/i.test(content)
}

export function transformParagraphHtml(
  rawHtml: string,
  resolveImage: (src: string, displayWidth: number) => string,
  displayWidth: number,
) {
  const withProxy = rawHtml.replace(INLINE_IMAGE_PATTERN, (match, src) => {
    if (!isLegadoAssetPath(src)) return match
    return match
      .replace('<img', `<img data-origin-src="${src}"`)
      .replace(src, resolveImage(src, displayWidth))
  })
  return sanitizeHtml(withProxy)
}

export function sanitizeHtml(input: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(input, 'text/html')
  doc
    .querySelectorAll('script,style,iframe,object,embed,link,meta')
    .forEach(node => node.remove())
  doc.querySelectorAll('*').forEach(node => {
    for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name)) {
        node.removeAttribute(attr.name)
      }
    }
    if (node instanceof HTMLAnchorElement) {
      node.target = '_blank'
      node.rel = 'noreferrer noopener'
    }
  })
  return doc.body.innerHTML
}

export function paragraphReadLength(content: string) {
  const placeholder = ' '
  return content.replace(INLINE_IMAGE_PATTERN, placeholder).length
}
