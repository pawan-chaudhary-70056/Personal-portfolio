import type { AdminProject, ProjectPayload, ProjectStatus } from '@/@types/admin'

export interface ScreenshotFormValues {
  /**
   * Stable React key for the row. Moving a row must keep its inputs mounted so
   * keyboard focus follows the screenshot that was reordered.
   */
  key?: string
  url: string
  /** Id of the picked or uploaded library asset; empty for an external URL. */
  mediaId: string
  alt: string
  caption: string
}

let screenshotKeySeed = 0

/** A blank gallery row with a unique key; the gallery can hold at most 8. */
export function emptyScreenshotRow(): ScreenshotFormValues {
  screenshotKeySeed += 1

  return {
    key: `screenshot-${screenshotKeySeed}`,
    url: '',
    mediaId: '',
    alt: '',
    caption: '',
  }
}

export interface ProjectFormValues {
  title: string
  slug: string
  summary: string
  description: string
  category: string
  year: string
  technologies: string
  liveUrl: string
  repositoryUrl: string
  imageUrl: string
  /** Id of the picked library asset; empty when an external URL is used. */
  coverMediaId: string
  imageAlt: string
  screenshots: ScreenshotFormValues[]
  status: ProjectStatus
  featured: boolean
  sortOrder: string
}

export function toFormValues(project?: AdminProject): ProjectFormValues {
  return {
    title: project?.title ?? '',
    slug: project?.slug ?? '',
    summary: project?.summary ?? '',
    description: project?.description ?? '',
    category: project?.category ?? 'Full-stack',
    year: project?.year ?? String(new Date().getFullYear()),
    technologies: project?.technologies.join(', ') ?? '',
    liveUrl: project?.liveUrl ?? '',
    repositoryUrl: project?.repositoryUrl ?? '',
    imageUrl: project?.imageUrl ?? '',
    coverMediaId: project?.coverMediaId ?? '',
    imageAlt: project?.imageAlt ?? '',
    screenshots:
      project?.screenshots.map((screenshot) => ({
        key: screenshot.id,
        url: screenshot.url ?? '',
        mediaId: screenshot.mediaId ?? '',
        alt: screenshot.alt,
        caption: screenshot.caption ?? '',
      })) ?? [],
    status: project?.status ?? 'DRAFT',
    featured: project?.featured ?? false,
    sortOrder: String(project?.sortOrder ?? 0),
  }
}

export function toProjectPayload(values: ProjectFormValues): ProjectPayload {
  const slug = values.slug.trim()
  const parsedSortOrder = Number.parseInt(values.sortOrder, 10)
  // The server accepts one cover source; a typed URL wins over a stale pick.
  const imageUrl = values.imageUrl.trim() || null
  const coverMediaId = imageUrl ? null : values.coverMediaId.trim() || null

  // Fully empty rows are discarded so the server only receives intended
  // screenshots; partially filled rows are rejected by client and server.
  const screenshots = values.screenshots
    .map((screenshot) => {
      // A picked library image replaces the typed URL for that row.
      const mediaId = screenshot.mediaId.trim() || null

      return {
        url: mediaId ? null : screenshot.url.trim() || null,
        mediaId,
        alt: screenshot.alt.trim(),
        caption: screenshot.caption.trim() || null,
      }
    })
    // A row without an image cannot be a screenshot; the form rejects partial
    // rows before this point, so only intentionally empty rows are dropped.
    .filter((screenshot) => screenshot.url || screenshot.mediaId)

  return {
    title: values.title.trim(),
    ...(slug ? { slug } : {}),
    summary: values.summary.trim(),
    description: values.description,
    category: values.category.trim(),
    year: values.year.trim(),
    technologies: values.technologies
      .split(',')
      .map((technology) => technology.trim())
      .filter(Boolean),
    liveUrl: values.liveUrl.trim() || null,
    repositoryUrl: values.repositoryUrl.trim() || null,
    imageUrl,
    coverMediaId,
    imageAlt: values.imageAlt.trim() || null,
    screenshots,
    status: values.status,
    featured: values.featured,
    sortOrder: Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
  }
}
