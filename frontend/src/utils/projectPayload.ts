import type { AdminProject, ProjectPayload, ProjectStatus } from '@/@types/admin'

export interface ScreenshotFormValues {
  url: string
  alt: string
  caption: string
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
    imageAlt: project?.imageAlt ?? '',
    screenshots:
      project?.screenshots.map((screenshot) => ({
        url: screenshot.url,
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

  // Fully empty rows are discarded so the server only receives intended
  // screenshots; partially filled rows are rejected by client and server.
  const screenshots = values.screenshots
    .map((screenshot) => ({
      url: screenshot.url.trim(),
      alt: screenshot.alt.trim(),
      caption: screenshot.caption.trim() || null,
    }))
    .filter(
      (screenshot) => screenshot.url || screenshot.alt || screenshot.caption !== null,
    )

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
    imageUrl: values.imageUrl.trim() || null,
    imageAlt: values.imageAlt.trim() || null,
    screenshots,
    status: values.status,
    featured: values.featured,
    sortOrder: Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
  }
}
