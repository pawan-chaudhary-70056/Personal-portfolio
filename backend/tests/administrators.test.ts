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
    'TRUNCATE TABLE "ContentRevision", "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile", "ProjectScreenshot", "ContactMessage" RESTART IDENTITY CASCADE',
  )
}

async function csrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200)
  return response.body.token as string
}

async function signedInAgent(
  email = TEST_ADMIN_EMAIL,
  password = TEST_ADMIN_PASSWORD,
): Promise<{ agent: TestAgent; token: string }> {
  const agent = request.agent(app)
  const token = await csrfToken(agent)
  await agent
    .post('/api/auth/login')
    .set('x-csrf-token', token)
    .send({ email, password })
    .expect(200)
  return { agent, token: await csrfToken(agent) }
}

const newEditor = {
  name: 'Content Editor',
  email: 'editor@example.com',
  password: 'Editor-Password-Long-Enough-1',
  role: 'EDITOR',
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

describe('administrator management', () => {
  it('lists accounts without secrets and creates an editor', async () => {
    const { agent, token } = await signedInAgent()

    const initial = await agent.get('/api/admin/administrators').expect(200)
    expect(initial.body.administrators).toHaveLength(1)
    expect(JSON.stringify(initial.body)).not.toContain('passwordHash')

    const created = await agent
      .post('/api/admin/administrators')
      .set('x-csrf-token', token)
      .send(newEditor)
      .expect(201)

    expect(created.body.administrator).toMatchObject({
      name: newEditor.name,
      email: newEditor.email,
      role: 'EDITOR',
      isActive: true,
    })
    expect(JSON.stringify(created.body)).not.toContain('passwordHash')
    expect(JSON.stringify(created.body)).not.toContain(newEditor.password)

    const duplicate = await agent
      .post('/api/admin/administrators')
      .set('x-csrf-token', token)
      .send(newEditor)
      .expect(409)
    expect(duplicate.body.error).toBe('conflict')

    const shortPassword = await agent
      .post('/api/admin/administrators')
      .set('x-csrf-token', token)
      .send({ ...newEditor, email: 'short@example.com', password: 'too-short' })
      .expect(400)
    expect(shortPassword.body.error).toBe('validation_error')

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'ADMIN_CREATED' } })
    expect(audit?.metadata).toMatchObject({ role: 'EDITOR' })
  })

  it('changes roles and keeps at least one active owner', async () => {
    const { agent, token } = await signedInAgent()
    const editor = await agent
      .post('/api/admin/administrators')
      .set('x-csrf-token', token)
      .send(newEditor)
      .expect(201)
    const editorId = editor.body.administrator.id as string
    const owner = await prisma.admin.findUniqueOrThrow({ where: { email: TEST_ADMIN_EMAIL } })

    const promoted = await agent
      .patch(`/api/admin/administrators/${editorId}`)
      .set('x-csrf-token', token)
      .send({ role: 'OWNER' })
      .expect(200)
    expect(promoted.body.administrator.role).toBe('OWNER')

    // With two active owners, demoting one is allowed.
    const demoted = await agent
      .patch(`/api/admin/administrators/${owner.id}`)
      .set('x-csrf-token', token)
      .send({ role: 'EDITOR' })
      .expect(200)
    expect(demoted.body.administrator.role).toBe('EDITOR')

    // The demoted account keeps content access but loses oversight access.
    await agent.get('/api/admin/administrators').expect(403)
    await agent.get('/api/admin/projects').expect(200)

    // The remaining owner can no longer be demoted or deactivated.
    const lastOwner = await signedInAgent(newEditor.email, newEditor.password)
    const demote = await lastOwner.agent
      .patch(`/api/admin/administrators/${editorId}`)
      .set('x-csrf-token', lastOwner.token)
      .send({ role: 'EDITOR' })
      .expect(409)
    expect(demote.body.error).toBe('conflict')

    await lastOwner.agent
      .patch(`/api/admin/administrators/${editorId}`)
      .set('x-csrf-token', lastOwner.token)
      .send({ isActive: false })
      .expect(409)
  })

  it('revokes sessions when an account is deactivated', async () => {
    const { agent, token } = await signedInAgent()
    const created = await agent
      .post('/api/admin/administrators')
      .set('x-csrf-token', token)
      .send(newEditor)
      .expect(201)
    const editorId = created.body.administrator.id as string

    const editor = await signedInAgent(newEditor.email, newEditor.password)
    await editor.agent.get('/api/admin/overview').expect(200)

    await agent
      .patch(`/api/admin/administrators/${editorId}`)
      .set('x-csrf-token', token)
      .send({ isActive: false })
      .expect(200)

    await editor.agent.get('/api/admin/overview').expect(401)

    const retry = request.agent(app)
    const retryToken = await csrfToken(retry)
    await retry
      .post('/api/auth/login')
      .set('x-csrf-token', retryToken)
      .send({ email: newEditor.email, password: newEditor.password })
      .expect(401)

    // Reactivation restores access.
    await agent
      .patch(`/api/admin/administrators/${editorId}`)
      .set('x-csrf-token', token)
      .send({ isActive: true })
      .expect(200)
    await signedInAgent(newEditor.email, newEditor.password)
  })

  it('resets a password, invalidates old sessions, and audits the change', async () => {
    const { agent, token } = await signedInAgent()
    const created = await agent
      .post('/api/admin/administrators')
      .set('x-csrf-token', token)
      .send(newEditor)
      .expect(201)
    const editorId = created.body.administrator.id as string

    const editor = await signedInAgent(newEditor.email, newEditor.password)
    const newPassword = 'Replacement-Password-Long-1'

    await agent
      .post(`/api/admin/administrators/${editorId}/password`)
      .set('x-csrf-token', token)
      .send({ password: newPassword })
      .expect(204)

    await editor.agent.get('/api/admin/overview').expect(401)
    await signedInAgent(newEditor.email, newPassword)

    await agent
      .post(`/api/admin/administrators/${editorId}/password`)
      .set('x-csrf-token', token)
      .send({ password: 'short' })
      .expect(400)

    await agent
      .post('/api/admin/administrators/missing-record/password')
      .set('x-csrf-token', token)
      .send({ password: newPassword })
      .expect(404)

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'ADMIN_PASSWORD_RESET' } })
    expect(audit?.metadata).toMatchObject({ sessionsRevoked: true })
  })
})
