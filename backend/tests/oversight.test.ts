import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

let passwordHash = ''

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile" RESTART IDENTITY CASCADE',
  )
}

async function csrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200)
  return response.body.token as string
}

async function signedInAgent(
  email = TEST_ADMIN_EMAIL,
  password = TEST_ADMIN_PASSWORD,
): Promise<TestAgent> {
  const agent = request.agent(app)
  const token = await csrfToken(agent)
  await agent
    .post('/api/auth/login')
    .set('x-csrf-token', token)
    .set('user-agent', 'Vitest Browser')
    .send({ email, password })
    .expect(200)
  return agent
}

async function createProject(agent: TestAgent, title: string): Promise<string> {
  const token = await csrfToken(agent)
  const response = await agent
    .post('/api/admin/projects')
    .set('x-csrf-token', token)
    .send({
      title,
      summary: 'A project created to exercise the audit log and session endpoints.',
      year: '2026',
    })
    .expect(201)

  return response.body.project.id as string
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

describe('audit log', () => {
  it('requires authentication and offers no write operations', async () => {
    await request(app).get('/api/admin/audit-logs').expect(401)

    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    // Audit records are append-only: there is no create endpoint.
    await agent.post('/api/admin/audit-logs').set('x-csrf-token', token).send({}).expect(404)
  })

  it('paginates events and reports accurate metadata', async () => {
    const agent = await signedInAgent()
    await createProject(agent, 'First audited project')
    await createProject(agent, 'Second audited project')

    const response = await agent
      .get('/api/admin/audit-logs?page=1&pageSize=1')
      .expect(200)

    expect(response.body.items).toHaveLength(1)
    expect(response.body.page).toBe(1)
    expect(response.body.pageSize).toBe(1)
    expect(response.body.total).toBeGreaterThanOrEqual(3)
    expect(response.body.pageCount).toBe(response.body.total)

    const secondPage = await agent
      .get('/api/admin/audit-logs?page=2&pageSize=1')
      .expect(200)

    expect(secondPage.body.items[0].id).not.toBe(response.body.items[0].id)
    expect(
      new Date(response.body.items[0].createdAt).getTime(),
    ).toBeGreaterThanOrEqual(new Date(secondPage.body.items[0].createdAt).getTime())
  })

  it('filters by entity type, search term, and date range', async () => {
    const agent = await signedInAgent()
    const projectId = await createProject(agent, 'Filtered project')

    const byType = await agent.get('/api/admin/audit-logs?entityType=Project').expect(200)
    expect(byType.body.items.length).toBeGreaterThan(0)
    expect(
      byType.body.items.every((item: { entityType: string }) => item.entityType === 'Project'),
    ).toBe(true)

    const bySearch = await agent
      .get(`/api/admin/audit-logs?search=${encodeURIComponent(projectId)}`)
      .expect(200)
    expect(bySearch.body.items.some((item: { entityId: string }) => item.entityId === projectId)).toBe(
      true,
    )

    const byAdmin = await agent
      .get(`/api/admin/audit-logs?search=${encodeURIComponent(TEST_ADMIN_EMAIL)}`)
      .expect(200)
    expect(
      byAdmin.body.items.some((item: { entityId: string }) => item.entityId === projectId),
    ).toBe(true)
    expect(byAdmin.body.total).toBeGreaterThanOrEqual(byType.body.total)

    const today = new Date().toISOString().slice(0, 10)
    const byDate = await agent
      .get(`/api/admin/audit-logs?from=${today}&to=${today}`)
      .expect(200)
    expect(byDate.body.total).toBeGreaterThan(0)

    const beforeToday = await agent
      .get('/api/admin/audit-logs?to=2000-01-01')
      .expect(200)
    expect(beforeToday.body.total).toBe(0)
    expect(beforeToday.body.items).toEqual([])
  })

  it('rejects malformed filters and page sizes', async () => {
    const agent = await signedInAgent()

    await agent.get('/api/admin/audit-logs?page=0').expect(400)
    await agent.get('/api/admin/audit-logs?pageSize=500').expect(400)
    await agent.get('/api/admin/audit-logs?entityType=Unknown').expect(400)
    await agent.get('/api/admin/audit-logs?from=2026-02-31').expect(400)
    await agent.get('/api/admin/audit-logs?from=2026-05-01&to=2026-04-01').expect(400)
    await agent.get(`/api/admin/audit-logs?action=${'A'.repeat(61)}`).expect(400)
  })
})

describe('sign-in monitoring', () => {
  async function failedLogin(email: string, password: string): Promise<void> {
    const agent = request.agent(app)
    const token = await csrfToken(agent)
    await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .set('user-agent', 'Attacker Browser')
      .send({ email, password })
      .expect(401)
  }

  it('requires authentication and offers no write operations', async () => {
    await request(app).get('/api/admin/login-monitoring').expect(401)

    const agent = await signedInAgent()
    const token = await csrfToken(agent)
    await agent
      .post('/api/admin/login-monitoring')
      .set('x-csrf-token', token)
      .send({})
      .expect(404)
  })

  it('aggregates failed sign-ins, their sources, and the recent attempts', async () => {
    const agent = await signedInAgent()

    // One attempt against an unknown account and one wrong password.
    await failedLogin('nobody@example.com', 'wrong-password')
    await failedLogin(TEST_ADMIN_EMAIL, 'also-wrong')

    const response = await agent.get('/api/admin/login-monitoring?days=7').expect(200)

    expect(response.body.windowDays).toBe(7)
    expect(response.body.totals).toEqual({
      failedLogins: 2,
      failedMfaCodes: 0,
      // The owner's own sign-in for this test is counted as a success.
      successfulLogins: 1,
    })

    // Both failures came from the test runner's address.
    expect(response.body.bySource).toHaveLength(1)
    expect(response.body.bySource[0].failures).toBe(2)
    expect(typeof response.body.bySource[0].ipAddress).toBe('string')

    expect(response.body.recent).toHaveLength(2)
    const [newest, older] = response.body.recent
    expect(newest).toMatchObject({
      action: 'AUTH_LOGIN_FAILED',
      email: TEST_ADMIN_EMAIL,
      reason: 'bad_password',
      userAgent: 'Attacker Browser',
    })
    expect(older).toMatchObject({
      email: 'nobody@example.com',
      reason: 'unknown_account',
    })

    // The report is a fixed shape: audit metadata and session state stay out.
    expect(Object.keys(newest).sort()).toEqual([
      'action',
      'createdAt',
      'email',
      'id',
      'ipAddress',
      'reason',
      'userAgent',
    ])
    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
  })

  it('excludes events outside the selected window', async () => {
    const agent = await signedInAgent()

    await prisma.auditEvent.create({
      data: {
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'Admin',
        metadata: { email: 'old@example.com', reason: 'bad_password' },
        ipAddress: '198.51.100.7',
        createdAt: new Date(Date.now() - 8 * 86_400_000),
      },
    })

    const week = await agent.get('/api/admin/login-monitoring?days=7').expect(200)
    expect(week.body.totals.failedLogins).toBe(0)
    expect(week.body.bySource).toEqual([])
    expect(week.body.recent).toEqual([])

    const month = await agent.get('/api/admin/login-monitoring?days=30').expect(200)
    expect(month.body.totals.failedLogins).toBe(1)
    expect(month.body.bySource).toEqual([
      {
        ipAddress: '198.51.100.7',
        failures: 1,
        lastFailureAt: expect.any(String),
      },
    ])
    expect(month.body.recent[0].email).toBe('old@example.com')
  })

  it('validates the window parameter', async () => {
    const agent = await signedInAgent()

    await agent.get('/api/admin/login-monitoring?days=0').expect(400)
    await agent.get('/api/admin/login-monitoring?days=31').expect(400)
    await agent.get('/api/admin/login-monitoring?days=abc').expect(400)
    await agent.get('/api/admin/login-monitoring?days=7&extra=1').expect(400)
  })
})

describe('session management', () => {
  it('requires authentication for listing and revocation', async () => {
    await request(app).get('/api/admin/sessions').expect(401)

    const agent = request.agent(app)
    const token = await csrfToken(agent)
    await agent.delete('/api/admin/sessions').set('x-csrf-token', token).expect(401)
  })

  it('lists own sessions without exposing session identifiers', async () => {
    const first = await signedInAgent()
    await signedInAgent()

    const response = await first.get('/api/admin/sessions').expect(200)
    const sessions = response.body.sessions as Array<{
      id: string
      current: boolean
      createdAt: string | null
      expiresAt: string
      userAgent: string | null
    }>

    expect(sessions).toHaveLength(2)
    expect(sessions.filter((session) => session.current)).toHaveLength(1)
    expect(sessions[0]?.current).toBe(true)
    expect(sessions.every((session) => /^[a-f0-9]{16}$/.test(session.id))).toBe(true)
    expect(sessions.every((session) => session.userAgent === 'Vitest Browser')).toBe(true)
    expect(sessions.every((session) => typeof session.expiresAt === 'string')).toBe(true)

    const storedSids = await prisma.session.findMany({ select: { sid: true } })
    const serialized = JSON.stringify(response.body)

    for (const { sid } of storedSids) {
      expect(serialized).not.toContain(sid)
    }
    expect(serialized).not.toContain('cookie')
  })

  it('revokes another session immediately and audits the change', async () => {
    const current = await signedInAgent()
    const other = await signedInAgent()

    const before = await current.get('/api/admin/sessions').expect(200)
    const target = (before.body.sessions as Array<{ id: string; current: boolean }>).find(
      (session) => !session.current,
    )

    expect(target).toBeDefined()

    const token = await csrfToken(current)
    await current
      .delete(`/api/admin/sessions/${target!.id}`)
      .set('x-csrf-token', token)
      .expect(204)

    await other.get('/api/admin/overview').expect(401)
    await current.get('/api/admin/overview').expect(200)

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'SESSION_REVOKED' } })
    expect(audit?.entityType).toBe('Admin')

    await current
      .delete(`/api/admin/sessions/${target!.id}`)
      .set('x-csrf-token', token)
      .expect(404)
  })

  it('refuses to revoke the current session through the API', async () => {
    const agent = await signedInAgent()
    const response = await agent.get('/api/admin/sessions').expect(200)
    const current = (response.body.sessions as Array<{ id: string; current: boolean }>).find(
      (session) => session.current,
    )

    const token = await csrfToken(agent)
    const result = await agent
      .delete(`/api/admin/sessions/${current!.id}`)
      .set('x-csrf-token', token)
      .expect(409)

    expect(result.body.error).toBe('conflict')
    await agent.get('/api/admin/overview').expect(200)
  })

  it('revokes every other session and keeps the current one', async () => {
    const current = await signedInAgent()
    const second = await signedInAgent()
    const third = await signedInAgent()

    const token = await csrfToken(current)
    const response = await current
      .delete('/api/admin/sessions')
      .set('x-csrf-token', token)
      .expect(200)

    expect(response.body.revoked).toBe(2)

    await second.get('/api/admin/overview').expect(401)
    await third.get('/api/admin/overview').expect(401)
    await current.get('/api/admin/overview').expect(200)

    const remaining = await current.get('/api/admin/sessions').expect(200)
    expect(remaining.body.sessions).toHaveLength(1)
    expect(remaining.body.sessions[0].current).toBe(true)

    const noOthers = await current
      .delete('/api/admin/sessions')
      .set('x-csrf-token', token)
      .expect(200)
    expect(noOthers.body.revoked).toBe(0)

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'SESSION_REVOKED_OTHERS' },
    })
    expect(audit?.metadata).toMatchObject({ revoked: 2 })
  })

  it('does not reveal or revoke another administrator’s sessions', async () => {
    const secondAdmin = await prisma.admin.create({
      data: {
        email: 'second@example.com',
        name: 'Second Admin',
        passwordHash,
        role: 'OWNER',
      },
    })

    const owner = await signedInAgent()
    const other = await signedInAgent(secondAdmin.email, TEST_ADMIN_PASSWORD)

    const ownerSessions = (await owner.get('/api/admin/sessions').expect(200)).body.sessions as Array<{
      id: string
    }>
    const otherSessions = (await other.get('/api/admin/sessions').expect(200)).body.sessions as Array<{
      id: string
    }>

    expect(ownerSessions).toHaveLength(1)
    expect(otherSessions).toHaveLength(1)
    expect(ownerSessions[0]?.id).not.toBe(otherSessions[0]?.id)

    const token = await csrfToken(owner)
    await owner
      .delete(`/api/admin/sessions/${otherSessions[0]!.id}`)
      .set('x-csrf-token', token)
      .expect(404)

    await other.get('/api/admin/overview').expect(200)
  })
})

describe('administrator roles', () => {
  const ownerOnlyEndpoints = [
    '/api/admin/health',
    '/api/admin/analytics',
    '/api/admin/audit-logs',
    '/api/admin/login-monitoring',
    '/api/admin/settings',
    '/api/admin/sessions',
    '/api/admin/administrators',
  ]

  it('keeps editors inside portfolio content and the inbox', async () => {
    await prisma.admin.create({
      data: { email: 'editor@example.com', name: 'Editor', passwordHash, role: 'EDITOR' },
    })

    const editor = await signedInAgent('editor@example.com')

    await editor.get('/api/admin/overview').expect(200)
    const projectId = await createProject(editor, 'Editor-authored project')
    await editor.get(`/api/admin/projects/${projectId}`).expect(200)

    for (const endpoint of ownerOnlyEndpoints) {
      const response = await editor.get(endpoint).expect(403)
      expect(response.body.error).toBe('forbidden')
    }
  })

  it('rejects administrator changes from an editor session', async () => {
    const editor = await prisma.admin.create({
      data: { email: 'editor@example.com', name: 'Editor', passwordHash, role: 'EDITOR' },
    })
    const agent = await signedInAgent('editor@example.com')
    const token = await csrfToken(agent)

    await agent
      .patch(`/api/admin/administrators/${editor.id}`)
      .set('x-csrf-token', token)
      .send({ role: 'OWNER' })
      .expect(403)

    const stored = await prisma.admin.findUnique({ where: { id: editor.id } })
    expect(stored?.role).toBe('EDITOR')
  })
})
