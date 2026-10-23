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
  return { agent, token }
}

function upload(
  agent: TestAgent,
  token: string,
  file: Buffer = PNG,
  filename = 'portrait.png',
) {
  return agent
    .post('/api/admin/homepage/portrait')
    .set('x-csrf-token', token)
    .attach('file', file, { filename, contentType: 'image/png' })
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

describe('homepage hero portrait', () => {
  it('requires authentication and a CSRF token', async () => {
    await request(app).get('/api/admin/homepage').expect(401)
    await request(app).get('/api/admin/media/whatever/file').expect(401)
    // CSRF is verified before authentication for state-changing requests.
    const anonymousUpload = await request(app)
      .post('/api/admin/homepage/portrait')
      .attach('file', PNG, { filename: 'portrait.png' })
      .expect(403)
    expect(anonymousUpload.body.error).toBe('csrf_failed')

    const { agent, token } = await signedInAgent()
    const blocked = await agent
      .post('/api/admin/homepage/portrait')
      .attach('file', PNG, { filename: 'portrait.png' })
      .expect(403)
    expect(blocked.body.error).toBe('csrf_failed')

    const publish = await agent.post('/api/admin/homepage/publish').expect(403)
    expect(publish.body.error).toBe('csrf_failed')

    // The public endpoint stays open and returns the fallback state.
    const hero = await request(app).get('/api/hero').expect(200)
    expect(hero.body.hero.portrait).toBeNull()
    expect(hero.body.hero.effect).toMatchObject({
      enabled: true,
      tiltIntensity: 40,
      animationIntensity: 50,
      floating: true,
    })

    expect(token).toBeTruthy()
  })

  it('stores an upload as a private draft and audits it', async () => {
    const { agent, token } = await signedInAgent()

    const uploaded = await upload(agent, token).expect(201)
    const draft = uploaded.body.homepage.draft

    expect(draft.portrait).toMatchObject({
      width: 1,
      height: 1,
      mimeType: 'image/png',
      alt: '',
    })
    expect(draft.portrait.url).toBe(`/api/admin/media/${draft.portrait.id}/file`)
    expect(draft.portrait).not.toHaveProperty('storageKey')
    expect(uploaded.body.homepage.published).toBeNull()
    expect(uploaded.body.homepage.hasUnpublishedChanges).toBe(true)
    expect(uploaded.body.homepage.limits.maxBytes).toBe(1_048_576)

    // Nothing is public before publishing, including the binary.
    const hero = await request(app).get('/api/hero').expect(200)
    expect(hero.body.hero.portrait).toBeNull()
    await request(app).get(`/api/media/hero-portrait/${draft.portrait.id}`).expect(404)

    // The administrator can still preview the draft file.
    const preview = await agent.get(`/api/admin/media/${draft.portrait.id}/file`).expect(200)
    expect(preview.headers['content-type']).toBe('image/png')
    expect(preview.headers['cache-control']).toBe('private, no-store')
    expect(preview.headers['content-length']).toBe(String(PNG.length))

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'MEDIA_UPLOADED' } })
    expect(audit?.entityId).toBe(draft.portrait.id)
  })

  it('rejects invalid, malformed, and oversized uploads without touching the draft', async () => {
    const { agent, token } = await signedInAgent()
    const uploaded = await upload(agent, token).expect(201)
    const originalId = uploaded.body.homepage.draft.portrait.id as string

    const text = await upload(agent, token, Buffer.from('not an image'), 'fake.png').expect(400)
    expect(text.body.error).toBe('invalid_image')

    const svg = await upload(
      agent,
      token,
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      'logo.svg',
    ).expect(400)
    expect(svg.body.error).toBe('invalid_image')

    const oversized = await upload(agent, token, Buffer.alloc(1_048_576 + 1)).expect(413)
    expect(oversized.body.error).toBe('file_too_large')

    const state = await agent.get('/api/admin/homepage').expect(200)
    expect(state.body.homepage.draft.portrait.id).toBe(originalId)
    expect(state.body.homepage.published).toBeNull()

    // No MediaAsset rows were created by the failures.
    expect(await prisma.mediaAsset.count()).toBe(1)
  })

  it('requires alt text before a visible portrait can be published', async () => {
    const { agent, token } = await signedInAgent()

    await upload(agent, token).expect(201)

    const blocked = await agent
      .post('/api/admin/homepage/publish')
      .set('x-csrf-token', token)
      .expect(400)
    expect((blocked.body.details as Array<{ path: string }>)[0]?.path).toBe('portraitAlt')

    const patched = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ portraitAlt: 'Portrait of the portfolio owner', tiltIntensity: 30 })
      .expect(200)
    expect(patched.body.homepage.draft.portrait.alt).toBe('Portrait of the portfolio owner')

    const published = await agent
      .post('/api/admin/homepage/publish')
      .set('x-csrf-token', token)
      .expect(200)
    expect(published.body.homepage.hasUnpublishedChanges).toBe(false)
    expect(published.body.homepage.published.portrait.alt).toBe(
      'Portrait of the portfolio owner',
    )
    expect(published.body.homepage.publishedAt).toBeTruthy()

    const hero = await request(app).get('/api/hero').expect(200)
    expect(hero.body.hero.portrait).toMatchObject({
      alt: 'Portrait of the portfolio owner',
      width: 1,
      height: 1,
      mimeType: 'image/png',
    })
    expect(hero.body.hero.portrait.url).toMatch(/^\/api\/media\/hero-portrait\/.+/)
    expect(hero.body.hero.effect.tiltIntensity).toBe(30)

    const image = await request(app).get(hero.body.hero.portrait.url).expect(200)
    expect(image.headers['content-type']).toBe('image/png')
    expect(image.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(image.headers['content-length']).toBe(String(PNG.length))

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'HOMEPAGE_PUBLISHED' } })
    expect(audit?.entityId).toBe('primary')
  })

  it('keeps unpublished changes private and supersedes the old asset safely', async () => {
    const { agent, token } = await signedInAgent()

    await upload(agent, token).expect(201)
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ portraitAlt: 'First portrait' })
      .expect(200)
    await agent.post('/api/admin/homepage/publish').set('x-csrf-token', token).expect(200)

    const first = await agent.get('/api/admin/homepage').expect(200)
    const firstId = first.body.homepage.published.portrait.id as string
    const firstAsset = await prisma.mediaAsset.findUnique({ where: { id: firstId } })

    // Upload a replacement and change effect settings without publishing.
    const replaced = await upload(agent, token).expect(201)
    const secondId = replaced.body.homepage.draft.portrait.id as string
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ portraitAlt: 'Second portrait', portraitVisible: true, floatingEnabled: false })
      .expect(200)

    const publicBefore = await request(app).get('/api/hero').expect(200)
    expect(publicBefore.body.hero.portrait.url).toContain(firstId)
    expect(publicBefore.body.hero.portrait.alt).toBe('First portrait')
    expect(publicBefore.body.hero.effect.floating).toBe(true)
    await request(app).get(`/api/media/hero-portrait/${secondId}`).expect(404)

    // The still-published asset is never deleted on replacement.
    expect(await prisma.mediaAsset.count()).toBe(2)

    await agent.post('/api/admin/homepage/publish').set('x-csrf-token', token).expect(200)

    const publicAfter = await request(app).get('/api/hero').expect(200)
    expect(publicAfter.body.hero.portrait.url).toContain(secondId)
    expect(publicAfter.body.hero.portrait.alt).toBe('Second portrait')
    expect(publicAfter.body.hero.effect.floating).toBe(false)

    // The superseded asset and file are gone; its public URL stops working.
    expect(await prisma.mediaAsset.findUnique({ where: { id: firstId } })).toBeNull()
    expect(await fileExists(firstAsset?.storageKey ?? 'missing')).toBe(false)
    await request(app).get(`/api/media/hero-portrait/${firstId}`).expect(404)
  })

  it('hides the portrait when visibility is disabled on publish', async () => {
    const { agent, token } = await signedInAgent()

    await upload(agent, token).expect(201)
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ portraitAlt: 'Visible portrait' })
      .expect(200)
    await agent.post('/api/admin/homepage/publish').set('x-csrf-token', token).expect(200)

    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ portraitVisible: false })
      .expect(200)

    // The change is draft-only until published.
    const before = await request(app).get('/api/hero').expect(200)
    expect(before.body.hero.portrait).not.toBeNull()

    await agent.post('/api/admin/homepage/publish').set('x-csrf-token', token).expect(200)

    const after = await request(app).get('/api/hero').expect(200)
    expect(after.body.hero.portrait).toBeNull()
  })

  it('removes the draft portrait and restores the fallback on publish', async () => {
    const { agent, token } = await signedInAgent()

    await upload(agent, token).expect(201)
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ portraitAlt: 'Temporary portrait' })
      .expect(200)
    await agent.post('/api/admin/homepage/publish').set('x-csrf-token', token).expect(200)

    const removed = await agent
      .delete('/api/admin/homepage/portrait')
      .set('x-csrf-token', token)
      .expect(200)
    expect(removed.body.homepage.draft.portrait).toBeNull()
    expect(removed.body.homepage.published.portrait).not.toBeNull()

    await agent.post('/api/admin/homepage/publish').set('x-csrf-token', token).expect(200)

    const hero = await request(app).get('/api/hero').expect(200)
    expect(hero.body.hero.portrait).toBeNull()
    expect(await prisma.mediaAsset.count()).toBe(0)
  })

  it('validates draft effect settings', async () => {
    const { agent, token } = await signedInAgent()

    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ tiltIntensity: 101 })
      .expect(400)
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ animationIntensity: -1 })
      .expect(400)
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ tiltIntensity: 'high' })
      .expect(400)
    await agent.patch('/api/admin/homepage').set('x-csrf-token', token).send({}).expect(400)
    // Unknown fields are rejected rather than silently ignored.
    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ tiltIntensity: 20, storageKey: 'x.png' })
      .expect(400)

    const updated = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({
        effectEnabled: false,
        tiltIntensity: 0,
        animationIntensity: 100,
        floatingEnabled: false,
      })
      .expect(200)
    expect(updated.body.homepage.draft).toMatchObject({
      effectEnabled: false,
      tiltIntensity: 0,
      animationIntensity: 100,
      floatingEnabled: false,
    })

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'HOMEPAGE_DRAFT_UPDATED' },
    })
    expect(audit?.entityType).toBe('HomepageSettings')
  })

  it('refuses to delete a referenced asset and removes unreferenced ones', async () => {
    const { agent, token } = await signedInAgent()

    const uploaded = await upload(agent, token).expect(201)
    const assetId = uploaded.body.homepage.draft.portrait.id as string
    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } })

    const blocked = await agent
      .delete(`/api/admin/media/${assetId}`)
      .set('x-csrf-token', token)
      .expect(409)
    expect(blocked.body.error).toBe('conflict')

    // Removing the draft also cleans up the now-unreferenced asset on its own.
    const removed = await agent
      .delete('/api/admin/homepage/portrait')
      .set('x-csrf-token', token)
      .expect(200)
    expect(removed.body.homepage.draft.portrait).toBeNull()
    expect(await prisma.mediaAsset.findUnique({ where: { id: assetId } })).toBeNull()
    expect(await fileExists(asset?.storageKey ?? 'missing')).toBe(false)

    // The manual delete endpoint still enforces references when a stale record
    // points at an asset (simulated here by detaching the draft reference).
    const second = await upload(agent, token).expect(201)
    const secondId = second.body.homepage.draft.portrait.id as string
    const secondAsset = await prisma.mediaAsset.findUnique({ where: { id: secondId } })
    await prisma.homepageSettings.update({
      where: { id: 'primary' },
      data: { draftPortraitId: null },
    })

    await agent.delete(`/api/admin/media/${secondId}`).set('x-csrf-token', token).expect(204)
    expect(await prisma.mediaAsset.findUnique({ where: { id: secondId } })).toBeNull()
    expect(await fileExists(secondAsset?.storageKey ?? 'missing')).toBe(false)

    await agent.delete(`/api/admin/media/${secondId}`).set('x-csrf-token', token).expect(404)
  })
})
