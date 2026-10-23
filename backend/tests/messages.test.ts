import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

// The limiter is exercised separately; keep it out of the way here.
const app = createApp({ loginRateLimitMax: 100, contactRateLimitMax: 100 })

let passwordHash = ''

const validMessage = {
  name: 'Example Visitor',
  email: 'Visitor@Example.com',
  subject: 'Project enquiry',
  message: 'I would like to discuss a potential project with you.',
}

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "ContactMessage", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile" RESTART IDENTITY CASCADE',
  )
}

async function csrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200)
  return response.body.token as string
}

async function submitMessage(
  agent: TestAgent,
  payload: Record<string, unknown> = validMessage,
  expectedStatus = 201,
) {
  const token = await csrfToken(agent)
  return agent
    .post('/api/contact')
    .set('x-csrf-token', token)
    .send(payload)
    .expect(expectedStatus)
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
  await prisma.admin.create({
    data: { email: TEST_ADMIN_EMAIL, name: TEST_ADMIN_NAME, passwordHash },
  })
})

describe('public contact submissions', () => {
  it('requires a CSRF token and validates every field', async () => {
    await request(app).post('/api/contact').send(validMessage).expect(403)

    const agent = request.agent(app)
    const response = await submitMessage(
      agent,
      { name: 'A', email: 'not-an-email', message: 'short' },
      400,
    )

    expect(response.body.error).toBe('validation_error')
    const paths = (response.body.details as Array<{ path: string }>).map((issue) => issue.path)
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'message']))
  })

  it('stores an accepted message and returns only a safe confirmation', async () => {
    const agent = request.agent(app)
    const response = await submitMessage(agent)

    expect(response.body).toEqual({ message: 'Thank you. Your message has been received.' })

    const stored = await prisma.contactMessage.findMany()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      name: validMessage.name,
      email: 'visitor@example.com',
      subject: validMessage.subject,
      message: validMessage.message,
      status: 'NEW',
      reviewedAt: null,
    })
  })

  it('accepts but discards honeypot submissions', async () => {
    const agent = request.agent(app)

    await submitMessage(agent, { ...validMessage, website: 'https://spam.example' })

    expect(await prisma.contactMessage.count()).toBe(0)
  })

  it('rate-limits repeated submissions from one connection', async () => {
    const limitedApp = createApp({ loginRateLimitMax: 100, contactRateLimitMax: 2 })
    const agent = request.agent(limitedApp)

    await submitMessage(agent)
    await submitMessage(agent)

    const blocked = await submitMessage(agent, validMessage, 429)
    expect(blocked.body.error).toBe('rate_limited')
    expect(await prisma.contactMessage.count()).toBe(2)
  })

  it('never exposes messages through public endpoints', async () => {
    const agent = request.agent(app)
    await submitMessage(agent)

    await request(app).get('/api/contact').expect(404)
    await request(app).get('/api/messages').expect(404)
    await request(app).get('/api/admin/messages').expect(401)

    const publicContent = await request(app).get('/api/profile').expect(200)
    expect(JSON.stringify(publicContent.body)).not.toContain(validMessage.message)
  })
})

describe('admin inbox', () => {
  it('requires authentication for every inbox operation', async () => {
    await request(app).get('/api/admin/messages').expect(401)
    await request(app).get('/api/admin/messages/anything').expect(401)

    const agent = request.agent(app)
    const token = await csrfToken(agent)
    await agent
      .patch('/api/admin/messages/anything')
      .set('x-csrf-token', token)
      .send({ status: 'READ' })
      .expect(401)
    await agent.delete('/api/admin/messages/anything').set('x-csrf-token', token).expect(401)
  })

  it('lists, searches, filters, and paginates messages', async () => {
    const agent = request.agent(app)
    await submitMessage(agent, { ...validMessage, name: 'Alice Example', subject: 'First' })
    await submitMessage(agent, {
      ...validMessage,
      name: 'Bob Example',
      subject: 'Second',
      message: 'A second message for the inbox pagination test.',
    })
    await submitMessage(agent, {
      ...validMessage,
      name: 'Carol Example',
      subject: 'Third',
      message: 'A third message for the inbox pagination test.',
    })

    const admin = await signedInAgent()

    const firstPage = await admin.get('/api/admin/messages?page=1&pageSize=2').expect(200)
    expect(firstPage.body.items).toHaveLength(2)
    expect(firstPage.body.total).toBe(3)
    expect(firstPage.body.pageCount).toBe(2)
    expect(firstPage.body.items[0].subject).toBe('Third')

    const secondPage = await admin.get('/api/admin/messages?page=2&pageSize=2').expect(200)
    expect(secondPage.body.items).toHaveLength(1)

    const searched = await admin.get('/api/admin/messages?search=alice').expect(200)
    expect(searched.body.items).toHaveLength(1)
    expect(searched.body.items[0].name).toBe('Alice Example')

    const filtered = await admin.get('/api/admin/messages?status=READ').expect(200)
    expect(filtered.body.items).toHaveLength(0)

    await admin.get('/api/admin/messages?pageSize=500').expect(400)
    await admin.get('/api/admin/messages?status=UNKNOWN').expect(400)
  })

  it('reads one message and updates its status with an audit record', async () => {
    const agent = request.agent(app)
    await submitMessage(agent)

    const admin = await signedInAgent()
    const list = await admin.get('/api/admin/messages').expect(200)
    const id = list.body.items[0].id as string

    const detail = await admin.get(`/api/admin/messages/${id}`).expect(200)
    expect(detail.body.message.message).toBe(validMessage.message)
    expect(detail.body.message.status).toBe('NEW')

    const token = await csrfToken(admin)
    const read = await admin
      .patch(`/api/admin/messages/${id}`)
      .set('x-csrf-token', token)
      .send({ status: 'READ' })
      .expect(200)

    expect(read.body.message.status).toBe('READ')
    expect(read.body.message.reviewedAt).toBeTruthy()

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'MESSAGE_STATUS_CHANGED', entityId: id },
    })
    expect(audit?.metadata).toMatchObject({ status: 'READ', previousStatus: 'NEW' })
    expect(JSON.stringify(audit?.metadata)).not.toContain(validMessage.message)

    const archived = await admin
      .patch(`/api/admin/messages/${id}`)
      .set('x-csrf-token', token)
      .send({ status: 'ARCHIVED' })
      .expect(200)
    expect(archived.body.message.status).toBe('ARCHIVED')
    expect(archived.body.message.reviewedAt).toBe(read.body.message.reviewedAt)

    await admin
      .patch(`/api/admin/messages/${id}`)
      .set('x-csrf-token', token)
      .send({ status: 'UNKNOWN' })
      .expect(400)
    await admin.patch(`/api/admin/messages/${id}`).set('x-csrf-token', token).send({}).expect(400)
  })

  it('deletes a message and records the deletion without its contents', async () => {
    const agent = request.agent(app)
    await submitMessage(agent)

    const admin = await signedInAgent()
    const list = await admin.get('/api/admin/messages').expect(200)
    const id = list.body.items[0].id as string
    const token = await csrfToken(admin)

    await admin.delete(`/api/admin/messages/${id}`).set('x-csrf-token', token).expect(204)

    await admin.get(`/api/admin/messages/${id}`).expect(404)
    expect(await prisma.contactMessage.count()).toBe(0)

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'MESSAGE_DELETED', entityId: id },
    })
    expect(audit?.entityType).toBe('ContactMessage')
    expect(JSON.stringify(audit?.metadata)).not.toContain(validMessage.message)
  })
})
