import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { publishDueContent } from '../src/services/scheduling.service.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

let passwordHash = ''

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ContentRevision", "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile", "ProjectScreenshot", "ContactMessage" RESTART IDENTITY CASCADE',
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
  return { agent, token: await csrfToken(agent) }
}

function createProject(agent: TestAgent, token: string, title: string) {
  return agent
    .post('/api/admin/projects')
    .set('x-csrf-token', token)
    .send({ title, summary: 'A project used to verify scheduled publishing.', year: '2026' })
}

function schedule(
  agent: TestAgent,
  token: string,
  type: string,
  id: string,
  publishAt: string | null,
) {
  return agent
    .patch(`/api/admin/schedule/${type}/${id}`)
    .set('x-csrf-token', token)
    .send({ publishAt })
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

describe('scheduled publishing', () => {
  it('requires authentication and a CSRF token', async () => {
    await request(app).get('/api/admin/scheduling').expect(401)

    const agent = request.agent(app)
    const token = await csrfToken(agent)
    await agent
      .patch('/api/admin/schedule/project/missing')
      .set('x-csrf-token', token)
      .send({ publishAt: new Date(Date.now() + 60_000).toISOString() })
      .expect(401)
  })

  it('schedules an unpublished record, lists it, and cancels the schedule', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, 'Scheduled project')
    const id = created.body.project.id as string
    const publishAt = new Date(Date.now() + 60 * 60 * 1000)

    const scheduled = await schedule(agent, token, 'project', id, publishAt.toISOString()).expect(
      200,
    )
    expect(scheduled.body).toEqual({ type: 'project', id, publishAt: publishAt.toISOString() })

    const listed = await agent.get('/api/admin/scheduling').expect(200)
    expect(listed.body.items).toEqual([
      {
        type: 'project',
        id,
        title: 'Scheduled project',
        subtitle: 'scheduled-project',
        publishAt: publishAt.toISOString(),
      },
    ])

    const cancelled = await schedule(agent, token, 'project', id, null).expect(200)
    expect(cancelled.body.publishAt).toBeNull()

    const stored = await prisma.project.findUnique({ where: { id } })
    expect(stored?.publishAt).toBeNull()
    expect(stored?.status).toBe('DRAFT')

    const actions = await prisma.auditEvent.findMany({ orderBy: { createdAt: 'asc' } })
    expect(actions.map((event) => event.action)).toContain('PROJECT_SCHEDULED')
    expect(actions.map((event) => event.action)).toContain('PROJECT_SCHEDULE_CANCELLED')
  })

  it('rejects past times, malformed bodies, published records, and trashed records', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, 'Unschedulable project')
    const id = created.body.project.id as string

    const past = await schedule(agent, token, 'project', id, new Date(Date.now() - 1000).toISOString()).expect(400)
    expect(past.body.error).toBe('validation_error')

    await schedule(agent, token, 'project', id, 'not-a-date').expect(400)

    await agent
      .post('/api/admin/bulk/project')
      .set('x-csrf-token', token)
      .send({ action: 'publish', ids: [id] })
      .expect(200)

    const published = await schedule(
      agent,
      token,
      'project',
      id,
      new Date(Date.now() + 60_000).toISOString(),
    ).expect(409)
    expect(published.body.error).toBe('conflict')

    await agent.delete(`/api/admin/projects/${id}`).set('x-csrf-token', token).expect(204)

    const trashed = await schedule(
      agent,
      token,
      'project',
      id,
      new Date(Date.now() + 60_000).toISOString(),
    ).expect(409)
    expect(trashed.body.error).toBe('conflict')

    await schedule(agent, token, 'project', 'missing-record', new Date(Date.now() + 60_000).toISOString()).expect(404)
  })

  it('publishes due records once and clears the schedule', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, 'Due project')
    const id = created.body.project.id as string
    const publishAt = new Date(Date.now() + 5000)

    await schedule(agent, token, 'project', id, publishAt.toISOString()).expect(200)

    // Not due yet: nothing changes.
    expect(await publishDueContent()).toEqual({ published: 0 })

    const firstRun = await publishDueContent(new Date(publishAt.getTime() + 1000))
    expect(firstRun).toEqual({ published: 1 })

    const stored = await prisma.project.findUnique({ where: { id } })
    expect(stored?.status).toBe('PUBLISHED')
    expect(stored?.publishAt).toBeNull()
    expect(stored?.publishedAt?.toISOString()).toBe(publishAt.toISOString())

    const publicList = await request(app).get('/api/projects').expect(200)
    expect(publicList.body.projects.map((project: { id: string }) => project.id)).toContain(id)

    // The conditional update makes a second run a no-op.
    const secondRun = await publishDueContent(new Date(publishAt.getTime() + 2000))
    expect(secondRun).toEqual({ published: 0 })

    const scheduledAudits = await prisma.auditEvent.findMany({
      where: { metadata: { path: ['scheduled'], equals: true } },
    })
    expect(scheduledAudits).toHaveLength(1)
  })
})
