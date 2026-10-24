import { describe, expect, it } from 'vitest'
import { toFormValues, toProjectPayload } from '@/utils/projectPayload'

describe('toFormValues', () => {
  it('provides defaults for a new project', () => {
    const values = toFormValues()

    expect(values).toMatchObject({
      title: '',
      slug: '',
      category: 'Full-stack',
      status: 'DRAFT',
      featured: false,
      sortOrder: '0',
      screenshots: [],
      year: String(new Date().getFullYear()),
    })
  })

  it('joins technologies and flattens screenshots from an existing project', () => {
    const values = toFormValues({
      title: 'Sample',
      slug: 'sample',
      summary: 'Summary',
      description: 'Body',
      category: 'Full-stack',
      year: '2026',
      technologies: ['React', 'Node'],
      liveUrl: null,
      repositoryUrl: 'https://example.com/repo',
      imageUrl: null,
      imageAlt: null,
      screenshots: [{ url: 'https://example.com/shot.png', alt: 'Shot', caption: null }],
      status: 'PUBLISHED',
      featured: true,
      sortOrder: 3,
    } as never)

    expect(values.technologies).toBe('React, Node')
    expect(values.screenshots).toEqual([
      { url: 'https://example.com/shot.png', mediaId: '', alt: 'Shot', caption: '' },
    ])
    expect(values.sortOrder).toBe('3')
    expect(values.status).toBe('PUBLISHED')
    expect(values.coverMediaId).toBe('')
  })
})

describe('toProjectPayload', () => {
  const base = toFormValues()

  it('trims text, splits technologies, and normalises blanks to null', () => {
    const payload = toProjectPayload({
      ...base,
      title: '  Trimmed title  ',
      summary: '  Summary  ',
      slug: '',
      technologies: ' React , , Node ',
      liveUrl: '   ',
      imageUrl: '  https://example.com/cover.png  ',
      imageAlt: '  Cover  ',
      sortOrder: 'not-a-number',
    })

    expect(payload).toMatchObject({
      title: 'Trimmed title',
      summary: 'Summary',
      technologies: ['React', 'Node'],
      liveUrl: null,
      imageUrl: 'https://example.com/cover.png',
      imageAlt: 'Cover',
      sortOrder: 0,
    })
    // An empty slug must be omitted so the server derives it from the title.
    expect('slug' in payload).toBe(false)
  })

  it('sends a picked library cover and clears the external URL', () => {
    const payload = toProjectPayload({
      ...base,
      imageUrl: '',
      coverMediaId: ' asset-123 ',
    })

    expect(payload.coverMediaId).toBe('asset-123')
    expect(payload.imageUrl).toBeNull()
  })

  it('gives a typed URL precedence over a stale library pick', () => {
    const payload = toProjectPayload({
      ...base,
      imageUrl: ' https://example.com/cover.png ',
      coverMediaId: 'asset-123',
    })

    expect(payload.imageUrl).toBe('https://example.com/cover.png')
    expect(payload.coverMediaId).toBeNull()
  })

  it('keeps an explicit slug and parses sortOrder', () => {
    const payload = toProjectPayload({ ...base, slug: 'my-slug', sortOrder: '7' })

    expect(payload.slug).toBe('my-slug')
    expect(payload.sortOrder).toBe(7)
  })

  it('drops fully empty screenshot rows and keeps filled ones', () => {
    const payload = toProjectPayload({
      ...base,
      screenshots: [
        { url: '', mediaId: '', alt: '', caption: '' },
        { url: ' https://example.com/a.png ', mediaId: '', alt: ' Alt ', caption: '' },
        { url: 'https://example.com/b.png', mediaId: '', alt: 'B', caption: 'Caption' },
      ],
    })

    expect(payload.screenshots).toEqual([
      { url: 'https://example.com/a.png', mediaId: null, alt: 'Alt', caption: null },
      { url: 'https://example.com/b.png', mediaId: null, alt: 'B', caption: 'Caption' },
    ])
  })

  it('sends a picked library image instead of the screenshot URL', () => {
    const payload = toProjectPayload({
      ...base,
      screenshots: [
        {
          url: 'https://example.com/stale.png',
          mediaId: 'asset-9',
          alt: 'Dashboard',
          caption: '',
        },
        { url: '', mediaId: '', alt: '', caption: 'Caption only' },
      ],
    })

    expect(payload.screenshots).toEqual([
      { url: null, mediaId: 'asset-9', alt: 'Dashboard', caption: null },
    ])
  })
})
