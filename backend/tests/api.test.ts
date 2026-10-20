import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_NAME,
  TEST_ADMIN_PASSWORD,
} from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

let passwordHash = ''

const validProject = {
  title: 'Secure Notes API',
  summary: 'A small REST service with sessions, validation, and audit logging.',
  year: '2026',
  technologies: ['Node.js', 'Express'],
}

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Project", "AuditEvent", "Admin", "session", "Skill", "Experience" RESTART IDENTITY CASCADE',
  )
}

async function seedAdmin(): Promise<void> {
  await prisma.admin.create({
    data: {
      email: TEST_ADMIN_EMAIL,
      name: TEST_ADMIN_NAME,
      passwordHash,
    },
  })
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

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_ADMIN_PASSWORD)
})

beforeEach(async () => {
  await resetDatabase()
  await seedAdmin()
})

describe('authorization', () => {
  it('rejects unauthenticated admin reads', async () => {
    await request(app).get('/api/admin/projects').expect(401)
    await request(app).get('/api/admin/overview').expect(401)
    await request(app).get('/api/admin/audit-events').expect(401)
  })

  it('rejects unauthenticated writes', async () => {
    // CSRF is verified first for every state-changing request, sign-in included.
    await request(app).post('/api/admin/projects').send(validProject).expect(403)

    // With a valid CSRF token but no session, authorization rejects with 401.
    const agent = request.agent(app)
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(validProject)
      .expect(401)

    expect(response.body.error).toBe('unauthorized')
  })

  it('does not expose unpublished projects through the public endpoint', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(validProject)
      .expect(201)

    const response = await request(app).get('/api/projects').expect(200)
    expect(response.body.projects).toEqual([])
  })
})

describe('authentication', () => {
  it('rejects sign-in without a CSRF token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(403)

    expect(response.body.error).toBe('csrf_failed')
  })

  it('rejects a CSRF token that does not match the cookie', async () => {
    const agent = request.agent(app)
    await csrfToken(agent)

    const response = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', 'a'.repeat(64))
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(403)

    expect(response.body.error).toBe('csrf_failed')
  })

  it('rejects a request from an untrusted origin', async () => {
    const agent = request.agent(app)
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/auth/login')
      .set('origin', 'https://evil.example')
      .set('x-csrf-token', token)
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(403)

    expect(response.body.error).toBe('origin_rejected')
  })

  it('returns the same generic message for unknown accounts and bad passwords', async () => {
    const agent = request.agent(app)
    const token = await csrfToken(agent)

    const unknown = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({ email: 'nobody@example.com', password: 'whatever-password' })
      .expect(401)

    const wrongPassword = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({ email: TEST_ADMIN_EMAIL, password: 'not-the-password' })
      .expect(401)

    expect(unknown.body).toEqual(wrongPassword.body)
    expect(unknown.body.message).toBe('Email or password is incorrect.')
  })

  it('signs in, exposes the session, and sets a hardened cookie', async () => {
    const agent = request.agent(app)
    const token = await csrfToken(agent)

    const login = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(200)

    expect(login.body.admin.email).toBe(TEST_ADMIN_EMAIL)
    expect(login.body.admin).not.toHaveProperty('passwordHash')

    const rawSetCookie: unknown = login.headers['set-cookie']
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie.join('; ')
      : String(rawSetCookie ?? '')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).not.toContain('passwordHash')

    const session = await agent.get('/api/auth/session').expect(200)
    expect(session.body.admin.email).toBe(TEST_ADMIN_EMAIL)

    const storedSessions = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT COUNT(*)::bigint AS count FROM "session"',
    )
    expect(Number(storedSessions[0]?.count)).toBeGreaterThan(0)
  })

  it('records successful and failed sign-in attempts in the audit log', async () => {
    const agent = request.agent(app)
    const token = await csrfToken(agent)

    await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({ email: TEST_ADMIN_EMAIL, password: 'wrong-password' })
      .expect(401)

    await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(200)

    const actions = await prisma.auditEvent.findMany({
      orderBy: { createdAt: 'asc' },
      select: { action: true },
    })

    expect(actions.map((event) => event.action)).toEqual([
      'AUTH_LOGIN_FAILED',
      'AUTH_LOGIN_SUCCEEDED',
    ])

    const failed = await prisma.auditEvent.findFirst({
      where: { action: 'AUTH_LOGIN_FAILED' },
    })
    expect(JSON.stringify(failed?.metadata)).not.toContain(TEST_ADMIN_PASSWORD)
  })

  it('destroys the session on sign-out', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent.post('/api/auth/logout').set('x-csrf-token', token).expect(204)
    await agent.get('/api/auth/session').expect(401)
    await agent.get('/api/admin/projects').expect(401)
  })

  it('rate limits repeated failed sign-in attempts', async () => {
    const limitedApp = createApp({ loginRateLimitMax: 2 })
    const agent = request.agent(limitedApp)
    const token = await csrfToken(agent)

    const attempt = () =>
      agent
        .post('/api/auth/login')
        .set('x-csrf-token', token)
        .send({ email: TEST_ADMIN_EMAIL, password: 'wrong-password' })

    await attempt().expect(401)
    await attempt().expect(401)
    const blocked = await attempt().expect(429)

    expect(blocked.body.error).toBe('rate_limited')
  })
})

describe('project CRUD', () => {
  it('validates input and reports field-level issues', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ title: 'x', summary: 'short', year: '99', liveUrl: 'javascript:alert(1)' })
      .expect(400)

    expect(response.body.error).toBe('validation_error')
    const paths = (response.body.details as Array<{ path: string }>).map((issue) => issue.path)
    expect(paths).toEqual(expect.arrayContaining(['title', 'summary', 'year', 'liveUrl']))
  })

  it('rejects writes without a CSRF token even when authenticated', async () => {
    const agent = await signedInAgent()

    const response = await agent.post('/api/admin/projects').send(validProject).expect(403)
    expect(response.body.error).toBe('csrf_failed')
  })

  it('creates a draft with a generated slug and an audit record', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(validProject)
      .expect(201)

    expect(response.body.project).toMatchObject({
      title: validProject.title,
      slug: 'secure-notes-api',
      status: 'DRAFT',
      publishedAt: null,
    })

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'PROJECT_CREATED' },
    })
    expect(audit?.entityId).toBe(response.body.project.id)
  })

  it('rejects a duplicate explicit slug', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...validProject, slug: 'taken-slug' })
      .expect(201)

    const response = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...validProject, title: 'Another project', slug: 'taken-slug' })
      .expect(409)

    expect(response.body.error).toBe('conflict')
  })

  it('keeps drafts out of the public endpoint until published', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(validProject)
      .expect(201)

    await request(app).get('/api/projects').expect(200).expect({ projects: [] })

    const published = await agent
      .patch(`/api/admin/projects/${created.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ status: 'PUBLISHED' })
      .expect(200)

    expect(published.body.project.status).toBe('PUBLISHED')
    expect(published.body.project.publishedAt).toBeTruthy()

    const publicList = await request(app).get('/api/projects').expect(200)
    expect(publicList.body.projects).toHaveLength(1)
    // Administrative fields must not leak through the public endpoint.
    expect(publicList.body.projects[0]).not.toHaveProperty('status')
    expect(publicList.body.projects[0]).not.toHaveProperty('sortOrder')
  })

  it('updates fields without resetting unrelated values', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...validProject, featured: true, status: 'PUBLISHED' })
      .expect(201)

    const updated = await agent
      .patch(`/api/admin/projects/${created.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ title: 'Renamed project' })
      .expect(200)

    expect(updated.body.project.title).toBe('Renamed project')
    expect(updated.body.project.featured).toBe(true)
    expect(updated.body.project.status).toBe('PUBLISHED')
    expect(updated.body.project.slug).toBe('secure-notes-api')
  })

  it('archives a published project and removes it from public listings', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...validProject, status: 'PUBLISHED' })
      .expect(201)

    const archived = await agent
      .patch(`/api/admin/projects/${created.body.project.id}`)
      .set('x-csrf-token', token)
      .send({ status: 'ARCHIVED' })
      .expect(200)

    expect(archived.body.project.archivedAt).toBeTruthy()
    await request(app).get('/api/projects').expect(200).expect({ projects: [] })
  })

  it('deletes a project and records the deletion', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(validProject)
      .expect(201)

    await agent
      .delete(`/api/admin/projects/${created.body.project.id}`)
      .set('x-csrf-token', token)
      .expect(204)

    await agent.get(`/api/admin/projects/${created.body.project.id}`).expect(404)

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'PROJECT_DELETED' },
    })
    expect(audit?.entityId).toBe(created.body.project.id)
  })

  it('filters, searches, and paginates the admin listing', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const titles = ['Alpha platform', 'Beta dashboard', 'Gamma toolkit']
    for (const [index, title] of titles.entries()) {
      await agent
        .post('/api/admin/projects')
        .set('x-csrf-token', token)
        .send({
          ...validProject,
          title,
          summary: `${title} summary that is long enough.`,
          status: index === 2 ? 'PUBLISHED' : 'DRAFT',
        })
        .expect(201)
    }

    const searched = await agent
      .get('/api/admin/projects?search=beta')
      .expect(200)
    expect(searched.body.total).toBe(1)
    expect(searched.body.items[0].title).toBe('Beta dashboard')

    const publishedOnly = await agent
      .get('/api/admin/projects?status=PUBLISHED')
      .expect(200)
    expect(publishedOnly.body.total).toBe(1)

    const paged = await agent
      .get('/api/admin/projects?pageSize=2&page=2')
      .expect(200)
    expect(paged.body).toMatchObject({ total: 3, page: 2, pageSize: 2, pageCount: 2 })
    expect(paged.body.items).toHaveLength(1)
  })

  it('reports overview counts and recent audit activity', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...validProject, status: 'PUBLISHED' })
      .expect(201)
    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send({ ...validProject, title: 'Draft project', featured: true })
      .expect(201)

    const overview = await agent.get('/api/admin/overview').expect(200)

    expect(overview.body.projects).toEqual({
      total: 2,
      draft: 1,
      published: 1,
      archived: 0,
      featured: 1,
    })
    expect(overview.body.recentEvents.length).toBeGreaterThan(0)
  })
})
