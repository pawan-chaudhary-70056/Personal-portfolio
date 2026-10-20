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
    'TRUNCATE TABLE "Project", "AuditEvent", "Admin", "session", "Skill", "Experience" RESTART IDENTITY CASCADE',
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

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_ADMIN_PASSWORD)
})

beforeEach(async () => {
  await resetDatabase()
  await prisma.admin.create({
    data: { email: TEST_ADMIN_EMAIL, name: TEST_ADMIN_NAME, passwordHash },
  })
})

describe('skills', () => {
  it('requires authentication and a CSRF token', async () => {
    await request(app).get('/api/admin/skills').expect(401)
    await request(app).post('/api/admin/skills').send({ name: 'TypeScript', category: 'Languages' }).expect(403)

    const agent = await signedInAgent()
    const response = await agent
      .post('/api/admin/skills')
      .send({ name: 'TypeScript', category: 'Languages' })
      .expect(403)

    expect(response.body.error).toBe('csrf_failed')
  })

  it('validates required fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: '', category: '' })
      .expect(400)

    const paths = (response.body.details as Array<{ path: string }>).map((issue) => issue.path)
    expect(paths).toEqual(expect.arrayContaining(['name', 'category']))
  })

  it('creates a published skill and records it', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'TypeScript', category: 'Languages', sortOrder: 2 })
      .expect(201)

    expect(response.body.skill).toMatchObject({
      name: 'TypeScript',
      category: 'Languages',
      sortOrder: 2,
      published: true,
    })

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'SKILL_CREATED' } })
    expect(audit?.entityId).toBe(response.body.skill.id)

    const publicList = await request(app).get('/api/skills').expect(200)
    expect(publicList.body.skills).toHaveLength(1)
  })

  it('enforces unique names within a category only', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'React', category: 'Frontend' })
      .expect(201)

    const duplicate = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'React', category: 'Frontend' })
      .expect(409)
    expect(duplicate.body.error).toBe('conflict')

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'React', category: 'Testing' })
      .expect(201)
  })

  it('updates only the provided fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Node.js', category: 'Backend', sortOrder: 5 })
      .expect(201)

    const updated = await agent
      .patch(`/api/admin/skills/${created.body.skill.id}`)
      .set('x-csrf-token', token)
      .send({ name: 'Node.js 24' })
      .expect(200)

    expect(updated.body.skill).toMatchObject({
      name: 'Node.js 24',
      category: 'Backend',
      sortOrder: 5,
      published: true,
    })
  })

  it('hides unpublished skills from the public endpoint', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Secret Tool', category: 'Internal', published: false })
      .expect(201)

    await request(app).get('/api/skills').expect(200).expect({ skills: [] })

    const admin = await agent.get('/api/admin/skills').expect(200)
    expect(admin.body.skills).toHaveLength(1)
    expect(admin.body.skills[0].published).toBe(false)
  })

  it('filters by search and category', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    for (const skill of [
      { name: 'PostgreSQL', category: 'Databases' },
      { name: 'Prisma', category: 'Databases' },
      { name: 'Vitest', category: 'Testing' },
    ]) {
      await agent.post('/api/admin/skills').set('x-csrf-token', token).send(skill).expect(201)
    }

    const searched = await agent.get('/api/admin/skills?search=pri').expect(200)
    expect(searched.body.skills).toHaveLength(1)
    expect(searched.body.skills[0].name).toBe('Prisma')

    const byCategory = await agent.get('/api/admin/skills?category=Databases').expect(200)
    expect(byCategory.body.skills).toHaveLength(2)
  })

  it('returns a single skill and 404 for unknown ids', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Zod', category: 'Validation' })
      .expect(201)

    const fetched = await agent.get(`/api/admin/skills/${created.body.skill.id}`).expect(200)
    expect(fetched.body.skill.name).toBe('Zod')

    await agent.get('/api/admin/skills/missing-record').expect(404)
  })

  it('deletes a skill and records the deletion', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Temporary', category: 'Testing' })
      .expect(201)

    await agent
      .delete(`/api/admin/skills/${created.body.skill.id}`)
      .set('x-csrf-token', token)
      .expect(204)

    await agent
      .patch(`/api/admin/skills/${created.body.skill.id}`)
      .set('x-csrf-token', token)
      .send({ name: 'Gone' })
      .expect(404)

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'SKILL_DELETED' } })
    expect(audit?.entityId).toBe(created.body.skill.id)
  })
})

describe('experience', () => {
  const baseExperience = {
    role: 'Software Development Intern',
    organization: 'Sample Organisation',
    startDate: '2025-02-01',
    isCurrent: true,
  }

  it('requires authentication', async () => {
    await request(app).get('/api/admin/experience').expect(401)
  })

  it('rejects a current role that has an end date', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, endDate: '2025-06-01' })
      .expect(400)

    expect(response.body.details).toEqual(
      expect.arrayContaining([{ path: 'endDate', message: 'A current role cannot have an end date.' }]),
    )
  })

  it('rejects an end date before the start date', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, isCurrent: false, endDate: '2024-06-01' })
      .expect(400)

    expect(response.body.details).toEqual(
      expect.arrayContaining([
        { path: 'endDate', message: 'The end date must be on or after the start date.' },
      ]),
    )
  })

  it('rejects impossible calendar dates', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, isCurrent: false, startDate: '2025-02-31' })
      .expect(400)

    expect(response.body.details).toEqual(
      expect.arrayContaining([{ path: 'startDate', message: 'Enter a real calendar date.' }]),
    )
  })

  it('creates an entry with date-only values and audits it', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, employmentType: 'Internship', location: 'Remote' })
      .expect(201)

    expect(response.body.experience.role).toBe(baseExperience.role)
    expect(response.body.experience.startDate.slice(0, 10)).toBe('2025-02-01')
    expect(response.body.experience.endDate).toBeNull()
    expect(response.body.experience.isCurrent).toBe(true)

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'EXPERIENCE_CREATED' } })
    expect(audit?.entityId).toBe(response.body.experience.id)
  })

  it('lists entries newest first', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    for (const startDate of ['2022-01-01', '2025-01-01', '2024-01-01']) {
      await agent
        .post('/api/admin/experience')
        .set('x-csrf-token', token)
        .send({ ...baseExperience, startDate, isCurrent: false, endDate: '2025-12-31' })
        .expect(201)
    }

    const list = await agent.get('/api/admin/experience').expect(200)
    const dates = (list.body.experience as Array<{ startDate: string }>).map((entry) =>
      entry.startDate.slice(0, 10),
    )
    expect(dates).toEqual(['2025-01-01', '2024-01-01', '2022-01-01'])
  })

  it('blocks making a role current while it still has an end date', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, isCurrent: false, endDate: '2025-06-01' })
      .expect(201)

    const response = await agent
      .patch(`/api/admin/experience/${created.body.experience.id}`)
      .set('x-csrf-token', token)
      .send({ isCurrent: true })
      .expect(400)

    expect(response.body.details).toEqual(
      expect.arrayContaining([{ path: 'endDate', message: 'A current role cannot have an end date.' }]),
    )
  })

  it('allows clearing the end date and marking the role current', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, isCurrent: false, endDate: '2025-06-01' })
      .expect(201)

    const updated = await agent
      .patch(`/api/admin/experience/${created.body.experience.id}`)
      .set('x-csrf-token', token)
      .send({ isCurrent: true, endDate: null })
      .expect(200)

    expect(updated.body.experience.isCurrent).toBe(true)
    expect(updated.body.experience.endDate).toBeNull()
  })

  it('hides unpublished entries from the public endpoint', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send({ ...baseExperience, published: false })
      .expect(201)

    await request(app).get('/api/experience').expect(200).expect({ experience: [] })
  })

  it('reports content totals on the overview', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Docker', category: 'Infrastructure' })
      .expect(201)
    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Kubernetes', category: 'Infrastructure', published: false })
      .expect(201)
    await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send(baseExperience)
      .expect(201)

    const overview = await agent.get('/api/admin/overview').expect(200)
    expect(overview.body.content).toEqual({
      skills: { total: 2, published: 1 },
      experience: { total: 1, published: 1 },
    })
  })

  it('exposes published entries without administrative fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send(baseExperience)
      .expect(201)

    const publicList = await request(app).get('/api/experience').expect(200)
    expect(publicList.body.experience).toHaveLength(1)
    expect(publicList.body.experience[0]).not.toHaveProperty('published')
    expect(publicList.body.experience[0]).not.toHaveProperty('createdAt')
  })

  it('returns a single entry and 404 for unknown ids', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send(baseExperience)
      .expect(201)

    const fetched = await agent
      .get(`/api/admin/experience/${created.body.experience.id}`)
      .expect(200)
    expect(fetched.body.experience.role).toBe(baseExperience.role)

    await agent.get('/api/admin/experience/missing-record').expect(404)
  })

  it('deletes an entry and records the deletion', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/experience')
      .set('x-csrf-token', token)
      .send(baseExperience)
      .expect(201)

    await agent
      .delete(`/api/admin/experience/${created.body.experience.id}`)
      .set('x-csrf-token', token)
      .expect(204)

    await agent.get('/api/admin/experience').expect(200).expect({ experience: [] })

    const audit = await prisma.auditEvent.findFirst({ where: { action: 'EXPERIENCE_DELETED' } })
    expect(audit?.entityId).toBe(created.body.experience.id)
  })
})
