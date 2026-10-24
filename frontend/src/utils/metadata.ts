interface PageMetadata {
  title: string
  description: string
  url?: string
  image?: string
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

/**
 * Updates document metadata for the current page.
 *
 * These tags are applied client-side after the app mounts. There is no
 * pre-render or server-render step: a crawler or link unfurl that does not
 * execute JavaScript sees the static defaults in index.html instead.
 */
export function setPageMetadata({ title, description, url, image }: PageMetadata): void {
  document.title = title

  upsertMeta('name', 'description', description)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)

  if (url) {
    upsertMeta('property', 'og:url', url)
  }

  if (image) {
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
  }
}
