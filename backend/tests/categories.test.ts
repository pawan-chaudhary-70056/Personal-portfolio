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

const projectPayload = (overrides: Record<string, unknown> = {}) => ({
  title: 'Ledger API',
  summary: 'A double-entry ledger service with strict validation and audit trails.',
  year: '2026',
  category: 'Backend',
  ...overrides,
})

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_ADMIN_PASSWORD)
})

beforeEach(async () => {
  await resetDatabase()
  await prisma.admin.create({
    data: { email: TEST_ADMIN_EMAIL, name: TEST_ADMIN_NAME, passwordHash },
  })
})

describe('category management', () => {
  it('requires authentication and a CSRF token', async () => {
    await request(app).get('/api/admin/project-categories').expect(401)
    await request(app).get('/api/admin/skill-categories').expect(401)
    await request(app)
      .post('/api/admin/project-categories')
      .send({ name: 'Backend' })
      .expect(403)

    const agent = await signedInAgent()
    const response = await agent
      .post('/api/admin/project-categories')
      .send({ name: 'Backend' })
      .expect(403)

    expect(response.body.error).toBe('csrf_failed')
  })

  it('creates project categories with a derived slug and records the action', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/project-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Data Engineering', sortOrder: 3 })
      .expect(201)

    expect(response.body.category).toMatchObject({
      name: 'Data Engineering',
      slug: 'data-engineering',
      sortOrder: 3,
    })

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'PROJECT_CATEGORY_CREATED' },
    })
    expect(audit?.entityId).toBe(response.body.category.id)
  })

  it('rejects duplicate names and slugs', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/skill-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Languages', slug: 'languages' })
      .expect(201)

    const duplicateName = await agent
      .post('/api/admin/skill-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Languages', slug: 'other-languages' })
      .expect(409)
    expect((duplicateName.body.details as Array<{ path: string }>)[0]?.path).toBe('name')

    const duplicateSlug = await agent
      .post('/api/admin/skill-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Spoken Languages', slug: 'languages' })
      .expect(409)
    expect((duplicateSlug.body.details as Array<{ path: string }>)[0]?.path).toBe('slug')
  })

  it('updates name, slug, and order, and keeps linked content in sync', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const category = await agent
      .post('/api/admin/project-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Backend' })
      .expect(201)

    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(projectPayload())
      .expect(201)

    const id = category.body.category.id as string
    const updated = await agent
      .patch(`/api/admin/project-categories/${id}`)
      .set('x-csrf-token', token)
      .send({ name: 'Server-side', sortOrder: 5 })
      .expect(200)

    expect(updated.body.category).toMatchObject({
      name: 'Server-side',
      slug: 'server-side',
      sortOrder: 5,
    })

    const projects = await agent.get('/api/admin/projects').expect(200)
    expect(projects.body.items[0].category).toBe('Server-side')
  })

  it('refuses to delete a category that still groups records', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const category = await agent
      .post('/api/admin/skill-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Testing' })
      .expect(201)

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Vitest', category: 'Testing' })
      .expect(201)

    const blocked = await agent
      .delete(`/api/admin/skill-categories/${category.body.category.id}`)
      .set('x-csrf-token', token)
      .expect(409)
    expect(blocked.body.message).toContain('1 skill')

    const skills = await agent.get('/api/admin/skills').expect(200)
    const skillId = skills.body.skills[0].id as string

    await agent
      .patch(`/api/admin/skills/${skillId}`)
      .set('x-csrf-token', token)
      .send({ category: 'Quality' })
      .expect(400)

    // A category created through the skills form can take the skill.
    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Playwright', category: 'Quality' })
      .expect(201)

    await agent
      .patch(`/api/admin/skills/${skillId}`)
      .set('x-csrf-token', token)
      .send({ category: 'Quality' })
      .expect(200)

    await agent
      .delete(`/api/admin/skill-categories/${category.body.category.id}`)
      .set('x-csrf-token', token)
      .expect(204)

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'SKILL_CATEGORY_DELETED' },
    })
    expect(audit?.entityId).toBe(category.body.category.id)
  })

  it('lists categories with usage counts in display order', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/project-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Second', sortOrder: 2 })
      .expect(201)
    await agent
      .post('/api/admin/project-categories')
      .set('x-csrf-token', token)
      .send({ name: 'First', sortOrder: 1 })
      .expect(201)
    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(projectPayload())
      .expect(201)

    const categories = await agent.get('/api/admin/project-categories').expect(200)
    expect(
      (categories.body.categories as Array<{ name: string; projectCount: number }>).map(
        (category) => [category.name, category.projectCount],
      ),
    ).toEqual([
      ['First', 0],
      ['Second', 0],
      ['Backend', 1],
    ])
  })

  it('creates a category when a project or skill uses a new name', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(projectPayload({ category: 'Platform' }))
      .expect(201)

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Kubernetes', category: 'Infrastructure' })
      .expect(201)

    expect(await prisma.projectCategory.count()).toBe(1)
    expect(await prisma.skillCategory.count()).toBe(1)
  })

  it('exposes only categories with published content publicly', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(projectPayload({ category: 'Published work', status: 'PUBLISHED' }))
      .expect(201)
    await agent
      .post('/api/admin/projects')
      .set('x-csrf-token', token)
      .send(projectPayload({ title: 'Draft work', category: 'Draft work' }))
      .expect(201)

    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'PostgreSQL', category: 'Databases' })
      .expect(201)
    await agent
      .post('/api/admin/skills')
      .set('x-csrf-token', token)
      .send({ name: 'Secrets', category: 'Internal', published: false })
      .expect(201)

    const projectCategories = await request(app).get('/api/project-categories').expect(200)
    expect(
      (projectCategories.body.categories as Array<{ name: string }>).map((item) => item.name),
    ).toEqual(['Published work'])

    const skillCategories = await request(app).get('/api/skill-categories').expect(200)
    expect((skillCategories.body.categories as Array<{ name: string }>).map((item) => item.name)).toEqual(
      ['Databases'],
    )

    const filtered = await request(app)
      .get('/api/projects?category=Published%20work')
      .expect(200)
    expect(filtered.body.projects).toHaveLength(1)

    const empty = await request(app).get('/api/projects?category=Draft%20work').expect(200)
    expect(empty.body.projects).toHaveLength(0)
  })

  it('validates category fields on update', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const category = await agent
      .post('/api/admin/skill-categories')
      .set('x-csrf-token', token)
      .send({ name: 'Languages' })
      .expect(201)

    await agent
      .patch(`/api/admin/skill-categories/${category.body.category.id}`)
      .set('x-csrf-token', token)
      .send({})
      .expect(400)

    await agent
      .patch(`/api/admin/skill-categories/${category.body.category.id}`)
      .set('x-csrf-token', token)
      .send({ slug: 'Not A Slug' })
      .expect(400)
  })
})
