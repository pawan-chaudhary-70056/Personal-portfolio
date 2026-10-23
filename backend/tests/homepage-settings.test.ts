import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

const DEFAULT_ORDER = ['about', 'work', 'skills', 'experience', 'credentials', 'contact']

const validProject = {
  title: 'Atlas dashboard',
  summary: 'A reporting interface with an audited publishing workflow.',
  year: '2026',
  technologies: ['React', 'PostgreSQL'],
}

let passwordHash = ''

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "Project", "ProjectScreenshot", "ContactMessage", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile" RESTART IDENTITY CASCADE',
  )
}

async function csrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200)
  return response.body.token as string
}

async function signedInAgent(): Promise<TestAgent> {
  const agent = request.agent(app)
  const token = await csrfToken(agent)
  await agent
    .post('/api/auth/login')
    .set('x-csrf-token', token)
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
    .expect(200)
  return agent
}

async function createProject(
  agent: TestAgent,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; slug: string }> {
  const token = await csrfToken(agent)
  const response = await agent
    .post('/api/admin/projects')
    .set('x-csrf-token', token)
    .send({ ...validProject, ...overrides })
    .expect(201)

  return { id: response.body.project.id as string, slug: response.body.project.slug as string }
}

async function publishProject(agent: TestAgent, id: string): Promise<void> {
  const token = await csrfToken(agent)
  await agent
    .patch(`/api/admin/projects/${id}`)
    .set('x-csrf-token', token)
    .send({ status: 'PUBLISHED' })
    .expect(200)
}

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_ADMIN_PASSWORD)
})

beforeEach(async () => {
  await resetDatabase()
  await prisma.admin.create({
    data: { email: TEST_ADMIN_EMAIL, name: TEST_ADMIN_NAME, passwordHash, role: 'OWNER' },
  })
})

describe('site settings', () => {
  it('requires an authenticated session and a CSRF token', async () => {
    await request(app).get('/api/admin/settings').expect(401)
    await request(app)
      .patch('/api/admin/settings')
      .send({ siteTitle: 'Someone else' })
      .expect(403)

    const agent = await signedInAgent()
    const response = await agent
      .patch('/api/admin/settings')
      .send({ siteTitle: 'No token' })
      .expect(403)

    expect(response.body.error).toBe('csrf_failed')
  })

  it('returns documented defaults before the owner saves anything', async () => {
    const agent = await signedInAgent()
    const response = await agent.get('/api/admin/settings').expect(200)

    expect(response.body.settings).toEqual({
      siteTitle: '',
      siteDescription: '',
      canonicalUrl: null,
      socialImageUrl: null,
      updatedAt: null,
    })
  })

  it('validates URLs and rejects fields outside the allowlist', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const invalidUrl = await agent
      .patch('/api/admin/settings')
      .set('x-csrf-token', token)
      .send({ siteTitle: 'Atelier', canonicalUrl: 'javascript:alert(1)' })
      .expect(400)

    expect(invalidUrl.body.error).toBe('validation_error')
    expect(
      (invalidUrl.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('canonicalUrl')

    const secretAttempt = await agent
      .patch('/api/admin/settings')
      .set('x-csrf-token', token)
      .send({ databaseUrl: 'postgres://internal' })
      .expect(400)

    expect(secretAttempt.body.error).toBe('validation_error')
  })

  it('saves settings, records audit activity, and exposes only approved public fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const saved = await agent
      .patch('/api/admin/settings')
      .set('x-csrf-token', token)
      .send({
        siteTitle: 'Mark Atelier',
        siteDescription: 'Selected engineering and design work.',
        canonicalUrl: 'https://example.com',
        socialImageUrl: 'https://example.com/og.png',
      })
      .expect(200)

    expect(saved.body.settings).toMatchObject({
      siteTitle: 'Mark Atelier',
      siteDescription: 'Selected engineering and design work.',
      canonicalUrl: 'https://example.com',
      socialImageUrl: 'https://example.com/og.png',
    })
    expect(saved.body.settings.updatedAt).toBeTruthy()

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'SITE_SETTINGS_UPDATED' },
    })
    expect(audit?.entityType).toBe('SiteSettings')

    const publicHomepage = await request(app).get('/api/portfolio/homepage').expect(200)

    expect(publicHomepage.body.homepage.site).toEqual({
      siteTitle: 'Mark Atelier',
      siteDescription: 'Selected engineering and design work.',
      canonicalUrl: 'https://example.com',
      socialImageUrl: 'https://example.com/og.png',
    })
  })
})

describe('homepage configuration', () => {
  it('returns the section catalog and default draft state', async () => {
    const agent = await signedInAgent()
    const response = await agent.get('/api/admin/homepage').expect(200)

    expect(response.body.homepage.draft.sectionOrder).toEqual(DEFAULT_ORDER)
    expect(response.body.homepage.draft.hiddenSections).toEqual([])
    expect(response.body.homepage.draft.featuredProjectIds).toEqual([])
    expect(response.body.homepage.sectionCatalog.map((section: { key: string }) => section.key)).toEqual(
      DEFAULT_ORDER,
    )
    expect(response.body.homepage.featuredCandidates).toEqual([])
    expect(response.body.homepage.maxFeaturedProjects).toBe(12)
  })

  it('rejects unknown, duplicate, and incomplete section orders', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const unknown = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ hiddenSections: ['pricing'] })
      .expect(400)
    expect(
      (unknown.body.details as Array<{ path: string }>).some((issue) =>
        issue.path.startsWith('hiddenSections'),
      ),
    ).toBe(true)

    const duplicate = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ sectionOrder: ['about', 'about', 'work', 'skills', 'experience', 'credentials'] })
      .expect(400)
    expect(
      (duplicate.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('sectionOrder')

    const incomplete = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ sectionOrder: ['about', 'work'] })
      .expect(400)
    expect(incomplete.body.details[0].path).toBe('sectionOrder')
    expect(incomplete.body.details[0].message).toMatch(/every section/i)
  })

  it('keeps draft layout private until the homepage is published', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const saved = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({
        sectionOrder: ['work', 'about', 'skills', 'experience', 'credentials', 'contact'],
        hiddenSections: ['contact'],
      })
      .expect(200)

    expect(saved.body.homepage.draft.sectionOrder[0]).toBe('work')
    expect(saved.body.homepage.draft.hiddenSections).toEqual(['contact'])
    expect(saved.body.homepage.hasUnpublishedChanges).toBe(true)

    const beforePublish = await request(app).get('/api/portfolio/homepage').expect(200)
    expect(beforePublish.body.homepage.sections).toEqual(
      DEFAULT_ORDER.map((key) => ({ key, visible: true })),
    )

    await agent
      .post('/api/admin/homepage/publish')
      .set('x-csrf-token', token)
      .expect(200)

    const afterPublish = await request(app).get('/api/portfolio/homepage').expect(200)
    expect(afterPublish.body.homepage.sections).toEqual([
      { key: 'work', visible: true },
      { key: 'about', visible: true },
      { key: 'skills', visible: true },
      { key: 'experience', visible: true },
      { key: 'credentials', visible: true },
      { key: 'contact', visible: false },
    ])
  })

  it('only features published projects and preserves the saved order', async () => {
    const agent = await signedInAgent()

    const first = await createProject(agent, { title: 'First project' })
    const second = await createProject(agent, { title: 'Second project' })

    // Fetching a CSRF token rotates the cookie, so take it after the creations.
    let token = await csrfToken(agent)

    const draftSelection = await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ featuredProjectIds: [first.id] })
      .expect(400)

    expect(draftSelection.body.details[0].path).toBe('featuredProjectIds')

    await publishProject(agent, first.id)
    await publishProject(agent, second.id)
    token = await csrfToken(agent)

    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ featuredProjectIds: [second.id, first.id] })
      .expect(200)

    await agent
      .post('/api/admin/homepage/publish')
      .set('x-csrf-token', token)
      .expect(200)

    const publicHomepage = await request(app).get('/api/portfolio/homepage').expect(200)
    expect(
      publicHomepage.body.homepage.featuredProjects.map(
        (project: { title: string }) => project.title,
      ),
    ).toEqual(['Second project', 'First project'])

    // Archiving a featured project hides it without corrupting the layout.
    await agent
      .patch(`/api/admin/projects/${second.id}`)
      .set('x-csrf-token', token)
      .send({ status: 'ARCHIVED' })
      .expect(200)

    const afterArchive = await request(app).get('/api/portfolio/homepage').expect(200)
    expect(
      afterArchive.body.homepage.featuredProjects.map((project: { id: string }) => project.id),
    ).toEqual([first.id])
  })

  it('drops unpublished references when publishing and never exposes them publicly', async () => {
    const agent = await signedInAgent()

    const project = await createProject(agent, { title: 'Temporary feature' })
    await publishProject(agent, project.id)

    const token = await csrfToken(agent)

    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ featuredProjectIds: [project.id] })
      .expect(200)

    await agent
      .patch(`/api/admin/projects/${project.id}`)
      .set('x-csrf-token', token)
      .send({ status: 'ARCHIVED' })
      .expect(200)

    const published = await agent
      .post('/api/admin/homepage/publish')
      .set('x-csrf-token', token)
      .expect(200)

    expect(published.body.homepage.published.featuredProjectIds).toEqual([])

    const publicHomepage = await request(app).get('/api/portfolio/homepage').expect(200)
    expect(publicHomepage.body.homepage.featuredProjects).toEqual([])
  })

  it('resets draft layout to the published state only through publish', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .patch('/api/admin/homepage')
      .set('x-csrf-token', token)
      .send({ hiddenSections: ['skills'] })
      .expect(200)
    await agent
      .post('/api/admin/homepage/publish')
      .set('x-csrf-token', token)
      .expect(200)

    const published = await agent.get('/api/admin/homepage').expect(200)
    expect(published.body.homepage.hasUnpublishedChanges).toBe(false)
    expect(published.body.homepage.published.hiddenSections).toEqual(['skills'])
  })
})
