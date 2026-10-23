import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

let passwordHash = ''

const validProject = {
  title: 'Gallery Project',
  summary: 'A project used to verify the screenshot gallery endpoints.',
  year: '2026',
}

const shotOne = {
  url: 'https://example.com/shot-1.png',
  alt: 'First screenshot',
  caption: 'Dashboard',
}

const shotTwo = {
  url: 'https://example.com/shot-2.png',
  alt: 'Second screenshot',
  caption: null,
}

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "ProjectScreenshot", "ContactMessage", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile" RESTART IDENTITY CASCADE',
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
  payload: Record<string, unknown>,
  status = 201,
) {
  const token = await csrfToken(agent)
  return agent
    .post('/api/admin/projects')
    .set('x-csrf-token', token)
    .send(payload)
    .expect(status)
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

describe('project screenshot galleries', () => {
  it('stores a gallery on create and returns it to the admin editor', async () => {
    const agent = await signedInAgent()

    const created = await createProject(agent, {
      ...validProject,
      screenshots: [shotOne, shotTwo],
    })

    const detail = await agent
      .get(`/api/admin/projects/${created.body.project.id}`)
      .expect(200)

    expect(detail.body.project.screenshots).toHaveLength(2)
    expect(detail.body.project.screenshots[0]).toMatchObject({
      url: shotOne.url,
      alt: shotOne.alt,
      caption: shotOne.caption,
      sortOrder: 0,
    })
    expect(detail.body.project.screenshots[1]).toMatchObject({
      url: shotTwo.url,
      alt: shotTwo.alt,
      caption: null,
      sortOrder: 1,
    })
  })

  it('exposes gallery fields only on the published public detail endpoint', async () => {
    const agent = await signedInAgent()
    await createProject(agent, {
      ...validProject,
      slug: 'gallery-project',
      status: 'PUBLISHED',
      screenshots: [shotOne, shotTwo],
    })

    const publicDetail = await request(app).get('/api/projects/gallery-project').expect(200)
    const gallery = publicDetail.body.project.screenshots

    expect(gallery).toHaveLength(2)
    expect(gallery[0]).toMatchObject({ url: shotOne.url, alt: shotOne.alt, caption: 'Dashboard' })
    expect(gallery[1]).toMatchObject({ url: shotTwo.url, alt: shotTwo.alt, caption: null })
    expect(gallery[0]).not.toHaveProperty('projectId')
    expect(gallery[0]).not.toHaveProperty('createdAt')

    const list = await request(app).get('/api/projects').expect(200)
    expect(list.body.projects[0].screenshots).toHaveLength(2)
  })

  it('keeps drafts and their galleries out of public responses', async () => {
    const agent = await signedInAgent()
    await createProject(agent, {
      ...validProject,
      slug: 'draft-gallery',
      status: 'DRAFT',
      screenshots: [shotOne],
    })

    await request(app).get('/api/projects/draft-gallery').expect(404)

    const list = await request(app).get('/api/projects').expect(200)
    expect(list.body.projects).toHaveLength(0)
  })

  it('replaces the gallery on update and preserves it when omitted', async () => {
    const agent = await signedInAgent()
    const created = await createProject(agent, {
      ...validProject,
      slug: 'gallery-replace',
      status: 'PUBLISHED',
      screenshots: [shotOne, shotTwo],
    })

    const token = await csrfToken(agent)
    const replacement = {
      url: 'https://example.com/shot-3.png',
      alt: 'Replacement screenshot',
      caption: 'Detail view',
    }

    await agent
      .patch(`/api/admin/projects/${created.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ screenshots: [replacement] })
      .expect(200)

    const afterReplace = await request(app).get('/api/projects/gallery-replace').expect(200)
    expect(afterReplace.body.project.screenshots).toHaveLength(1)
    expect(afterReplace.body.project.screenshots[0]).toMatchObject({
      url: replacement.url,
      alt: replacement.alt,
    })

    await agent
      .patch(`/api/admin/projects/${created.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ summary: 'The summary changed but the gallery did not.' })
      .expect(200)

    const afterSummary = await request(app).get('/api/projects/gallery-replace').expect(200)
    expect(afterSummary.body.project.screenshots).toHaveLength(1)
    expect(afterSummary.body.project.screenshots[0].url).toBe(replacement.url)
  })

  it('validates screenshot fields with field-level issues', async () => {
    const agent = await signedInAgent()

    const missingAlt = await createProject(
      agent,
      { ...validProject, slug: 'missing-alt', screenshots: [{ url: shotOne.url, alt: '   ' }] },
      400,
    )
    const altPaths = (missingAlt.body.details as Array<{ path: string }>).map(
      (issue) => issue.path,
    )
    expect(altPaths).toContain('screenshots.0.alt')

    const badUrl = await createProject(
      agent,
      {
        ...validProject,
        slug: 'bad-url',
        screenshots: [{ url: 'javascript:alert(1)', alt: 'Anything' }],
      },
      400,
    )
    const urlPaths = (badUrl.body.details as Array<{ path: string }>).map((issue) => issue.path)
    expect(urlPaths).toContain('screenshots.0.url')

    const tooMany = await createProject(
      agent,
      {
        ...validProject,
        slug: 'too-many',
        screenshots: Array.from({ length: 9 }, (_value, index) => ({
          url: `https://example.com/${index}.png`,
          alt: `Shot ${index}`,
        })),
      },
      400,
    )
    const countPaths = (tooMany.body.details as Array<{ path: string }>).map(
      (issue) => issue.path,
    )
    expect(countPaths).toContain('screenshots')

    expect(await prisma.projectScreenshot.count()).toBe(0)
  })

  it('keeps the gallery in the trash and removes it on permanent deletion', async () => {
    const agent = await signedInAgent()
    const created = await createProject(agent, {
      ...validProject,
      slug: 'deleted-gallery',
      screenshots: [shotOne, shotTwo],
    })
    const projectId = created.body.project.id as string

    expect(await prisma.projectScreenshot.count()).toBe(2)

    const token = await csrfToken(agent)
    await agent
      .delete(`/api/admin/projects/${projectId}`)
      .set('x-csrf-token', token)
      .expect(204)

    // Trashing keeps the gallery so a restore is lossless.
    expect(await prisma.projectScreenshot.count()).toBe(2)
    await agent.get(`/api/admin/projects/${projectId}`).expect(404)

    const trash = await agent.get('/api/admin/trash?type=project').expect(200)
    expect(trash.body.items.map((item: { id: string }) => item.id)).toContain(projectId)

    await agent
      .delete(`/api/admin/trash/project/${projectId}`)
      .set('x-csrf-token', token)
      .expect(204)

    expect(await prisma.projectScreenshot.count()).toBe(0)
  })
})
