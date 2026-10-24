import { access } from 'node:fs/promises'
import path from 'node:path'
import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { mediaRootPath } from '../src/services/media-storage.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

/** A real 1×1 PNG; the upload path inspects headers rather than decoding pixels. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

let passwordHash = ''

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile", "ProjectScreenshot", "ContactMessage" RESTART IDENTITY CASCADE',
  )
}

async function csrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200)
  return response.body.token as string
}

async function signedInAgent(): Promise<{ agent: TestAgent; token: string }> {
  const agent = request.agent(app)
  const token = await csrfToken(agent)
  await agent
    .post('/api/auth/login')
    .set('x-csrf-token', token)
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
    .expect(200)

  // Signing in does not rotate the token, but request a fresh one so callers do
  // not depend on that detail.
  return { agent, token: await csrfToken(agent) }
}

function upload(
  agent: TestAgent,
  token: string,
  file: Buffer = PNG,
  filename = 'library.png',
) {
  return agent
    .post('/api/admin/media')
    .set('x-csrf-token', token)
    .attach('file', file, { filename, contentType: 'image/png' })
}

async function mediaExists(id: string): Promise<boolean> {
  return (await prisma.mediaAsset.count({ where: { id } })) === 1
}

async function fileExists(storageKey: string): Promise<boolean> {
  try {
    await access(path.join(mediaRootPath(), storageKey))
    return true
  } catch {
    return false
  }
}

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_ADMIN_PASSWORD)
})

beforeEach(async () => {
  await resetDatabase()
  await prisma.admin.create({
    data: { email: TEST_ADMIN_EMAIL, name: TEST_ADMIN_NAME, passwordHash },
  })
})

describe('media library', () => {
  it('requires authentication and a CSRF token', async () => {
    await request(app).get('/api/admin/media').expect(401)
    await request(app).post('/api/admin/media').attach('file', PNG, 'x.png').expect(403)

    const agent = request.agent(app)
    const token = await csrfToken(agent)
    const unauthorized = await agent
      .post('/api/admin/media')
      .set('x-csrf-token', token)
      .attach('file', PNG, 'x.png')
      .expect(401)

    expect(unauthorized.body.error).toBe('unauthorized')

    await request(app).get('/api/admin/media/anything').expect(401)
  })

  it('uploads a valid image, records it, and serves the bytes to an administrator', async () => {
    const { agent, token } = await signedInAgent()

    const response = await upload(agent, token)
    expect(response.status).toBe(201)
    expect(response.body.media).toMatchObject({
      originalFilename: 'library.png',
      mimeType: 'image/png',
      width: 1,
      height: 1,
      altText: null,
    })
    expect(response.body.media.url).toBe(`/api/admin/media/${response.body.media.id}/file`)

    const stored = await prisma.mediaAsset.findUnique({
      where: { id: response.body.media.id },
    })
    expect(stored).not.toBeNull()
    expect(await fileExists(stored?.storageKey ?? '')).toBe(true)

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'MEDIA_UPLOADED', entityId: response.body.media.id },
    })
    expect(audit?.entityType).toBe('MediaAsset')

    const listing = await agent.get('/api/admin/media').expect(200)
    expect(listing.body.items).toHaveLength(1)
    expect(listing.body.items[0]).toMatchObject({
      id: response.body.media.id,
      referenced: false,
    })
    expect(listing.body.items[0]).not.toHaveProperty('storageKey')

    const file = await agent
      .get(`/api/admin/media/${response.body.media.id}/file`)
      .expect(200)
    expect(file.headers['content-type']).toBe('image/png')
    expect(file.headers['cache-control']).toBe('private, no-store')

    await request(app).get(`/api/admin/media/${response.body.media.id}/file`).expect(401)
  })

  it('rejects files that are not allowlisted images and files above the size limit', async () => {
    const { agent, token } = await signedInAgent()

    const notAnImage = await upload(
      agent,
      token,
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      'vector.svg',
    )
    expect(notAnImage.status).toBe(400)
    expect(notAnImage.body.error).toBe('invalid_image')

    // The test environment caps uploads at 1 MB; the limit is enforced by the
    // multipart parser before the bytes are inspected.
    const tooLarge = await upload(agent, token, Buffer.alloc(1024 * 1024 + 1), 'large.png')
    expect(tooLarge.status).toBe(413)
    expect(tooLarge.body.error).toBe('file_too_large')

    expect(await prisma.mediaAsset.count()).toBe(0)
  })

  it('searches filenames and alt text and paginates the listing', async () => {
    const { agent, token } = await signedInAgent()

    const names = ['alpha.png', 'beta.png', 'gamma.png']
    for (const name of names) {
      await upload(agent, token, PNG, name).expect(201)
    }

    const searched = await agent.get('/api/admin/media?search=beta').expect(200)
    expect(searched.body.total).toBe(1)
    expect(searched.body.items[0].originalFilename).toBe('beta.png')

    const paged = await agent.get('/api/admin/media?pageSize=2&page=2').expect(200)
    expect(paged.body).toMatchObject({ total: 3, page: 2, pageSize: 2, pageCount: 2 })
    expect(paged.body.items).toHaveLength(1)

    const invalid = await agent.get('/api/admin/media?pageSize=500').expect(400)
    expect(invalid.body.error).toBe('validation_error')

    const first = searched.body.items[0]
    await agent
      .patch(`/api/admin/media/${first.id}`)
      .set('x-csrf-token', token)
      .send({ altText: 'A searchable description' })
      .expect(200)

    const byAlt = await agent.get('/api/admin/media?search=searchable').expect(200)
    expect(byAlt.body.items[0].id).toBe(first.id)
  })

  it('reads metadata and updates only the allowed fields', async () => {
    const { agent, token } = await signedInAgent()
    const created = await upload(agent, token).expect(201)
    const id = created.body.media.id as string

    const metadata = await agent.get(`/api/admin/media/${id}`).expect(200)
    expect(metadata.body.media).toMatchObject({ id, altText: null })

    const updated = await agent
      .patch(`/api/admin/media/${id}`)
      .set('x-csrf-token', token)
      .send({ altText: 'Dashboard screenshot' })
      .expect(200)
    expect(updated.body.media.altText).toBe('Dashboard screenshot')

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'MEDIA_UPDATED', entityId: id },
    })
    expect(audit).not.toBeNull()

    // Clearing the description stores null.
    const cleared = await agent
      .patch(`/api/admin/media/${id}`)
      .set('x-csrf-token', token)
      .send({ altText: '' })
      .expect(200)
    expect(cleared.body.media.altText).toBeNull()

    const unknownField = await agent
      .patch(`/api/admin/media/${id}`)
      .set('x-csrf-token', token)
      .send({ storageKey: '../escape.png' })
      .expect(400)
    expect(unknownField.body.error).toBe('validation_error')

    const tooLong = await agent
      .patch(`/api/admin/media/${id}`)
      .set('x-csrf-token', token)
      .send({ altText: 'a'.repeat(201) })
      .expect(400)
    expect(tooLong.body.details[0].path).toBe('altText')

    await agent.get('/api/admin/media/missing-id').expect(404)
    await agent.get('/api/admin/media/missing-id/file').expect(404)
  })

  it('deletes an unreferenced asset and its stored file', async () => {
    const { agent, token } = await signedInAgent()
    const created = await upload(agent, token).expect(201)
    const id = created.body.media.id as string
    const stored = await prisma.mediaAsset.findUnique({ where: { id } })
    const storageKey = stored?.storageKey ?? ''

    await agent.delete(`/api/admin/media/${id}`).set('x-csrf-token', token).expect(204)

    expect(await mediaExists(id)).toBe(false)
    expect(await fileExists(storageKey)).toBe(false)
    await agent.get(`/api/admin/media/${id}`).expect(404)

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'MEDIA_DELETED', entityId: id },
    })
    expect(audit).not.toBeNull()
  })

  it('refuses to delete an asset the homepage still uses', async () => {
    const { agent, token } = await signedInAgent()

    const portrait = await agent
      .post('/api/admin/homepage/portrait')
      .set('x-csrf-token', token)
      .attach('file', PNG, { filename: 'portrait.png', contentType: 'image/png' })
      .expect(201)

    const id = portrait.body.homepage.draft.portrait.id as string

    const listing = await agent.get('/api/admin/media').expect(200)
    expect(listing.body.items[0]).toMatchObject({ id, referenced: true })

    const blocked = await agent
      .delete(`/api/admin/media/${id}`)
      .set('x-csrf-token', token)
      .expect(409)

    expect(blocked.body.error).toBe('conflict')
    expect(await mediaExists(id)).toBe(true)
  })
})

describe('media attached to projects and the profile', () => {
  const baseProject = {
    title: 'Cover project',
    summary: 'A summary used by the cover tests',
    category: 'Full-stack',
    year: '2026',
  }

  const baseProfile = {
    displayName: 'Test Person',
    headline: 'Product designer',
    biography: 'A biography long enough to satisfy the profile rules.',
    portraitAlt: 'Portrait of the portfolio owner',
  }

  async function uploadedAsset(agent: TestAgent, token: string): Promise<string> {
    const created = await upload(agent, token).expect(201)
    return created.body.media.id as string
  }

  it('serves a published project cover and keeps a draft cover private', async () => {
    const { agent, token } = await signedInAgent()
    const coverId = await uploadedAsset(agent, token)

    const draft = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...baseProject, coverMediaId: coverId, status: 'DRAFT' })
      .expect(201)

    expect(draft.body.project).toMatchObject({ coverMediaId: coverId, imageUrl: null })

    const coverUrl = `/api/media/project-cover/${coverId}`
    await request(app).get(coverUrl).expect(404)
    await request(app).get(`/api/projects/${draft.body.project.slug}`).expect(404)

    await agent
      .patch(`/api/admin/projects/${draft.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ status: 'PUBLISHED' })
      .expect(200)

    const served = await request(app).get(coverUrl).expect(200)
    expect(served.headers['content-type']).toBe('image/png')
    expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable')

    const detail = await request(app).get(`/api/projects/${draft.body.project.slug}`).expect(200)
    expect(detail.body.project.imageUrl).toBe(coverUrl)
    // The internal reference never reaches a public response.
    expect(detail.body.project).not.toHaveProperty('coverMediaId')

    const listing = await request(app).get('/api/projects').expect(200)
    expect(listing.body.projects[0].imageUrl).toBe(coverUrl)
  })

  it('protects a cover from deletion and detaches it when an external URL is saved', async () => {
    const { agent, token } = await signedInAgent()
    const coverId = await uploadedAsset(agent, token)

    const project = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...baseProject, coverMediaId: coverId, status: 'PUBLISHED' })
      .expect(201)

    const listing = await agent.get('/api/admin/media').expect(200)
    expect(listing.body.items[0]).toMatchObject({ id: coverId, referenced: true })

    const blocked = await agent
      .delete(`/api/admin/media/${coverId}`)
      .set('x-csrf-token', token)
      .expect(409)
    expect(blocked.body.error).toBe('conflict')

    const replaced = await agent
      .patch(`/api/admin/projects/${project.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ imageUrl: 'https://example.com/cover.png' })
      .expect(200)
    expect(replaced.body.project.coverMediaId).toBeNull()
    expect(replaced.body.project.imageUrl).toBe('https://example.com/cover.png')

    const detail = await request(app).get(`/api/projects/${project.body.project.slug}`).expect(200)
    expect(detail.body.project.imageUrl).toBe('https://example.com/cover.png')
    await request(app).get(`/api/media/project-cover/${coverId}`).expect(404)

    await agent.delete(`/api/admin/media/${coverId}`).set('x-csrf-token', token).expect(204)
    expect(await mediaExists(coverId)).toBe(false)
  })

  it('rejects two cover sources and unknown asset ids', async () => {
    const { agent, token } = await signedInAgent()
    const coverId = await uploadedAsset(agent, token)

    const both = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({
        ...baseProject,
        coverMediaId: coverId,
        imageUrl: 'https://example.com/cover.png',
      })
      .expect(400)
    expect(both.body.error).toBe('validation_error')
    expect(both.body.details[0].path).toBe('coverMediaId')

    const missing = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...baseProject, coverMediaId: 'missing-asset' })
      .expect(400)
    expect(missing.body.error).toBe('invalid_media')
    expect(missing.body.details[0].path).toBe('coverMediaId')
  })

  it('serves an uploaded gallery image only while its project is published', async () => {
    const { agent, token } = await signedInAgent()
    const shotId = await uploadedAsset(agent, token)
    const shotUrl = `/api/media/project-screenshot/${shotId}`

    const draft = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({
        ...baseProject,
        status: 'DRAFT',
        screenshots: [{ mediaId: shotId, url: null, alt: 'Dashboard overview' }],
      })
      .expect(201)

    // The admin read keeps the reference so the edit form can render it.
    const adminRead = await agent
      .get(`/api/admin/projects/${draft.body.project.id}`)
      .expect(200)
    expect(adminRead.body.project.screenshots[0]).toMatchObject({
      mediaId: shotId,
      url: null,
      alt: 'Dashboard overview',
      sortOrder: 0,
    })

    await request(app).get(shotUrl).expect(404)

    await agent
      .patch(`/api/admin/projects/${draft.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ status: 'PUBLISHED' })
      .expect(200)

    const served = await request(app).get(shotUrl).expect(200)
    expect(served.headers['content-type']).toBe('image/png')
    expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable')

    const detail = await request(app).get(`/api/projects/${draft.body.project.slug}`).expect(200)
    expect(detail.body.project.screenshots[0]).toMatchObject({
      url: shotUrl,
      alt: 'Dashboard overview',
    })
    // The internal reference never reaches a public response.
    expect(detail.body.project.screenshots[0]).not.toHaveProperty('mediaId')
  })

  it('protects a gallery image from deletion and frees it when the gallery changes', async () => {
    const { agent, token } = await signedInAgent()
    const shotId = await uploadedAsset(agent, token)

    const project = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({
        ...baseProject,
        status: 'PUBLISHED',
        screenshots: [
          { mediaId: shotId, url: null, alt: 'Library screenshot' },
          { url: 'https://example.com/other.png', alt: 'Hosted screenshot' },
        ],
      })
      .expect(201)

    const listing = await agent.get('/api/admin/media').expect(200)
    expect(listing.body.items[0]).toMatchObject({ id: shotId, referenced: true })

    await agent
      .delete(`/api/admin/media/${shotId}`)
      .set('x-csrf-token', token)
      .expect(409)
    expect(await mediaExists(shotId)).toBe(true)

    // Replacing the gallery with external URLs detaches the asset.
    await agent
      .patch(`/api/admin/projects/${project.body.project.id}`)
      .set('x-csrf-token', token)
      .send({
        screenshots: [{ url: 'https://example.com/other.png', alt: 'Hosted screenshot' }],
      })
      .expect(200)

    const detail = await request(app).get(`/api/projects/${project.body.project.slug}`).expect(200)
    expect(detail.body.project.screenshots).toHaveLength(1)
    expect(detail.body.project.screenshots[0].url).toBe('https://example.com/other.png')

    await agent.delete(`/api/admin/media/${shotId}`).set('x-csrf-token', token).expect(204)
    expect(await mediaExists(shotId)).toBe(false)
  })

  it('restores a gallery image from a revision snapshot', async () => {
    const { agent, token } = await signedInAgent()
    const shotId = await uploadedAsset(agent, token)

    const project = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({
        ...baseProject,
        status: 'PUBLISHED',
        screenshots: [{ mediaId: shotId, url: null, alt: 'Library screenshot' }],
      })
      .expect(201)

    // Replacing the gallery with an external image writes a second revision.
    await agent
      .patch(`/api/admin/projects/${project.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ screenshots: [{ url: 'https://example.com/other.png', alt: 'Hosted' }] })
      .expect(200)

    const revisions = await agent
      .get(
        `/api/admin/revisions?entityType=Project&entityId=${project.body.project.id}`,
      )
      .expect(200)
    const created = (revisions.body.items as Array<{ id: string; action: string }>).find(
      (revision) => revision.action === 'CREATED',
    )
    expect(created).toBeDefined()

    await agent
      .post(`/api/admin/revisions/${created?.id}/restore`)
      .set('x-csrf-token', token)
      .expect(200)

    const detail = await request(app).get(`/api/projects/${project.body.project.slug}`).expect(200)
    expect(detail.body.project.screenshots[0].url).toBe(
      `/api/media/project-screenshot/${shotId}`,
    )
    await request(app).get(`/api/media/project-screenshot/${shotId}`).expect(200)
  })

  it('rejects two screenshot sources and unknown gallery asset ids', async () => {
    const { agent, token } = await signedInAgent()
    const shotId = await uploadedAsset(agent, token)

    const both = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({
        ...baseProject,
        screenshots: [
          {
            mediaId: shotId,
            url: 'https://example.com/other.png',
            alt: 'Two sources',
          },
        ],
      })
      .expect(400)
    expect(both.body.error).toBe('validation_error')
    expect(both.body.details[0].path).toBe('screenshots.0.mediaId')

    const neither = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...baseProject, screenshots: [{ alt: 'No source' }] })
      .expect(400)
    expect(neither.body.details[0].path).toBe('screenshots.0.mediaId')

    const missing = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({
        ...baseProject,
        screenshots: [{ mediaId: 'missing-asset', alt: 'Unknown asset' }],
      })
      .expect(400)
    expect(missing.body.error).toBe('invalid_media')
    expect(missing.body.details[0].path).toBe('screenshots.0.mediaId')

    expect(await prisma.project.count()).toBe(0)
  })

  it('publishes an uploaded profile portrait and protects it from deletion', async () => {
    const { agent, token } = await signedInAgent()
    const portraitId = await uploadedAsset(agent, token)
    const portraitUrl = `/api/media/profile-portrait/${portraitId}`

    const saved = await agent
      .patch('/api/admin/profile')
      .set('x-csrf-token', token)
      .send({ ...baseProfile, portraitMediaId: portraitId })
      .expect(200)
    expect(saved.body.profile).toMatchObject({ portraitMediaId: portraitId, portraitUrl: null })

    const publicProfile = await request(app).get('/api/profile').expect(200)
    expect(publicProfile.body.profile.portraitUrl).toBe(portraitUrl)
    expect(publicProfile.body.profile).not.toHaveProperty('portraitMediaId')

    const served = await request(app).get(portraitUrl).expect(200)
    expect(served.headers['content-type']).toBe('image/png')

    await agent
      .delete(`/api/admin/media/${portraitId}`)
      .set('x-csrf-token', token)
      .expect(409)

    // Switching back to a hosted URL detaches the upload.
    await agent
      .patch('/api/admin/profile')
      .set('x-csrf-token', token)
      .send({ portraitUrl: 'https://example.com/me.png', portraitMediaId: null })
      .expect(200)

    const external = await request(app).get('/api/profile').expect(200)
    expect(external.body.profile.portraitUrl).toBe('https://example.com/me.png')
    await request(app).get(portraitUrl).expect(404)

    await agent.delete(`/api/admin/media/${portraitId}`).set('x-csrf-token', token).expect(204)
  })

  it('rejects a profile with both portrait sources', async () => {
    const { agent, token } = await signedInAgent()
    const portraitId = await uploadedAsset(agent, token)

    const both = await agent
      .patch('/api/admin/profile')
      .set('x-csrf-token', token)
      .send({
        ...baseProfile,
        portraitMediaId: portraitId,
        portraitUrl: 'https://example.com/me.png',
      })
      .expect(400)

    expect(both.body.error).toBe('validation_error')
    expect(both.body.details[0].path).toBe('portraitUrl')
  })
})
