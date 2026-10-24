/**
 * Public image URLs for assets attached to content. Asset ids are immutable, so
 * these URLs never change and may be cached indefinitely (docs/07 §10).
 */

export function projectCoverUrl(id: string): string {
  return `/api/media/project-cover/${id}`
}

export function profilePortraitUrl(id: string): string {
  return `/api/media/profile-portrait/${id}`
}

export function projectScreenshotUrl(id: string): string {
  return `/api/media/project-screenshot/${id}`
}
