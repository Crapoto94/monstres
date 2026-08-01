const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.])/g
const ANCHOR_PATTERN = /<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function linkify(input: string): string {
  if (!input) return ''

  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const anchorRegex = new RegExp(ANCHOR_PATTERN)
  while ((match = anchorRegex.exec(input)) !== null) {
    parts.push(linkifyUrls(escapeHtml(input.slice(lastIndex, match.index))))
    const url = match[1]
    const text = match[2].trim() || url
    parts.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`)
    lastIndex = match.index + match[0].length
  }
  parts.push(linkifyUrls(escapeHtml(input.slice(lastIndex))))

  return parts.join('')
}

function linkifyUrls(escaped: string): string {
  return escaped.replace(URL_PATTERN, (url: string) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`
  })
}
