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

const projectFields = {
  title: 'Bulk project',
  summary: 'A summary long enough to pass validation.',
  year: '2026',
}

function createProject(
  agent: TestAgent,
  token: string,
  overrides: Record<string, string | boolean> = {},
) {
  return agent
    .post('/api/admin/projects')
    .set('x-csrf-token', token)
    .send({ ...projectFields, ...overrides })
}

function createSkill(agent: TestAgent, token: string, name: string) {
  return agent
    .post('/api/admin/skills')
    .set('x-csrf-token', token)
    .send({ name, category: 'Languages', published: false })
}

function createCertification(agent: TestAgent, token: string, name: string) {
  return agent
    .post('/api/admin/certifications')
    .set('x-csrf-token', token)
    .send({ name, issuingOrganization: 'Standards Body', published: true })
}

function bulk(agent: TestAgent, token: string, type: string, body: object) {
  return agent.post(`/api/admin/bulk/${type}`).set('x-csrf-token', token).send(body)
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

describe('bulk actions', () => {
  it('requires authentication and a CSRF token', async () => {
    await request(app)
      .post('/api/admin/bulk/project')
      .send({ action: 'publish', ids: ['x'] })
      .expect(403)

    const agent = request.agent(app)
    const token = await csrfToken(agent)
    await agent
      .post('/api/admin/bulk/project')
      .set('x-csrf-token', token)
      .send({ action: 'publish', ids: ['x'] })
      .expect(401)
  })

  it('publishes and unpublishes several projects in one request', async () => {
    const { agent, token } = await signedInAgent()
    const first = await createProject(agent, token, { title: 'First bulk project' })
    const second = await createProject(agent, token, { title: 'Second bulk project' })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)

    const ids = [first.body.project.id, second.body.project.id] as string[]
    const published = await bulk(agent, token, 'project', { action: 'publish', ids }).expect(200)
    expect(published.body).toEqual({ type: 'project', action: 'publish', updated: 2 })

    const listed = await agent.get('/api/admin/projects').expect(200)
    expect(listed.body.items.every((item: { status: string }) => item.status === 'PUBLISHED')).toBe(
      true,
    )

    const publicList = await request(app).get('/api/projects').expect(200)
    expect(publicList.body.projects).toHaveLength(2)

    await bulk(agent, token, 'project', { action: 'unpublish', ids }).expect(200)

    const afterUnpublish = await request(app).get('/api/projects').expect(200)
    expect(afterUnpublish.body.projects).toHaveLength(0)

    const audits = await prisma.auditEvent.findMany({
      where: { action: 'PROJECT_STATUS_CHANGED' },
    })
    expect(audits).toHaveLength(4)
    expect(audits[0]?.metadata).toMatchObject({ bulk: true })
  })

  it('is atomic when a selected record is already in the trash', async () => {
    const { agent, token } = await signedInAgent()
    const first = await createSkill(agent, token, 'TypeScript')
    const second = await createSkill(agent, token, 'PostgreSQL')
    const ids = [first.body.skill.id, second.body.skill.id] as string[]

    await agent
      .delete(`/api/admin/skills/${second.body.skill.id}`)
      .set('x-csrf-token', token)
      .expect(204)

    const blocked = await bulk(agent, token, 'skill', { action: 'publish', ids }).expect(409)
    expect(blocked.body.error).toBe('conflict')

    const skills = await prisma.skill.findMany()
    expect(skills.every((skill) => !skill.published)).toBe(true)
  })

  it('rejects malformed bulk payloads', async () => {
    const { agent, token } = await signedInAgent()

    await bulk(agent, token, 'project', { action: 'publish', ids: [] }).expect(400)
    await bulk(agent, token, 'project', {
      action: 'archive',
      ids: ['a'],
    }).expect(400)
    await bulk(agent, token, 'project', {
      action: 'publish',
      ids: Array.from({ length: 51 }, (_, index) => `id-${index}`),
    }).expect(400)
    await bulk(agent, token, 'unknown', { action: 'publish', ids: ['a'] }).expect(400)
  })

  it('moves several records to the trash', async () => {
    const { agent, token } = await signedInAgent()
    const first = await createCertification(agent, token, 'Certification One')
    const second = await createCertification(agent, token, 'Certification Two')
    const ids = [first.body.certification.id, second.body.certification.id] as string[]

    const result = await bulk(agent, token, 'certification', {
      action: 'delete',
      ids,
    }).expect(200)
    expect(result.body.updated).toBe(2)

    const trash = await agent.get('/api/admin/trash?type=certification').expect(200)
    expect(trash.body.total).toBe(2)

    const audits = await prisma.auditEvent.findMany({
      where: { action: 'CERTIFICATION_DELETED' },
    })
    expect(audits).toHaveLength(2)
    expect(audits[0]?.metadata).toMatchObject({ bulk: true, trashed: true })
  })
})

describe('trash', () => {
  it('hides trashed content and restores it losslessly', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, {
      title: 'Trashable project',
      status: 'PUBLISHED',
      slug: 'trashable-project',
    })
    const id = created.body.project.id as string

    expect((await request(app).get('/api/projects/trashable-project').expect(200)).status).toBe(200)

    await agent.delete(`/api/admin/projects/${id}`).set('x-csrf-token', token).expect(204)

    await request(app).get('/api/projects/trashable-project').expect(404)
    const adminList = await agent.get('/api/admin/projects').expect(200)
    expect(adminList.body.items).toHaveLength(0)
    await agent.get(`/api/admin/projects/${id}`).expect(404)

    const trash = await agent.get('/api/admin/trash?type=project').expect(200)
    expect(trash.body.items[0]).toMatchObject({
      type: 'project',
      id,
      title: 'Trashable project',
      published: true,
      status: 'PUBLISHED',
    })

    await agent
      .post(`/api/admin/trash/project/${id}/restore`)
      .set('x-csrf-token', token)
      .expect(200)

    const restored = await agent.get(`/api/admin/projects/${id}`).expect(200)
    expect(restored.body.project.status).toBe('PUBLISHED')
    await request(app).get('/api/projects/trashable-project').expect(200)

    const audits = await prisma.auditEvent.findMany({ where: { action: 'PROJECT_RESTORED' } })
    expect(audits).toHaveLength(1)
  })

  it('restores and purges only records that are in the trash', async () => {
    const { agent, token } = await signedInAgent()
    const live = await createSkill(agent, token, 'Live skill')
    const trashed = await createSkill(agent, token, 'Trashed skill')
    const liveId = live.body.skill.id as string
    const trashedId = trashed.body.skill.id as string

    await agent
      .post(`/api/admin/trash/skill/${liveId}/restore`)
      .set('x-csrf-token', token)
      .expect(409)
    await agent.delete(`/api/admin/trash/skill/${liveId}`).set('x-csrf-token', token).expect(409)

    await agent.delete(`/api/admin/skills/${trashedId}`).set('x-csrf-token', token).expect(204)

    await agent
      .post(`/api/admin/trash/skill/${trashedId}/restore`)
      .set('x-csrf-token', token)
      .expect(200)
    await agent.delete(`/api/admin/skills/${trashedId}`).set('x-csrf-token', token).expect(204)

    await agent.delete(`/api/admin/trash/skill/${trashedId}`).set('x-csrf-token', token).expect(204)

    expect(await prisma.skill.count({ where: { id: trashedId } })).toBe(0)
    const audits = await prisma.auditEvent.findMany({ where: { action: 'SKILL_PURGED' } })
    expect(audits).toHaveLength(1)
  })

  it('restores several records across content types in one request', async () => {
    const { agent, token } = await signedInAgent()
    const project = await createProject(agent, token, { title: 'Bulk restored project' })
    const skill = await createSkill(agent, token, 'Bulk restored skill')
    const projectId = project.body.project.id as string
    const skillId = skill.body.skill.id as string

    await agent.delete(`/api/admin/projects/${projectId}`).set('x-csrf-token', token).expect(204)
    await agent.delete(`/api/admin/skills/${skillId}`).set('x-csrf-token', token).expect(204)

    const items = [
      { type: 'project', id: projectId },
      { type: 'skill', id: skillId },
      // A duplicate must not be restored or counted twice.
      { type: 'project', id: projectId },
    ]

    const restored = await agent
      .post('/api/admin/trash/restore')
      .set('x-csrf-token', token)
      .send({ items })
      .expect(200)
    expect(restored.body).toEqual({ restored: 2 })

    await agent.get(`/api/admin/projects/${projectId}`).expect(200)
    await agent.get(`/api/admin/skills/${skillId}`).expect(200)
    expect((await agent.get('/api/admin/trash').expect(200)).body.total).toBe(0)

    const audits = await prisma.auditEvent.findMany({
      where: { action: { in: ['PROJECT_RESTORED', 'SKILL_RESTORED'] } },
    })
    expect(audits).toHaveLength(2)
  })

  it('permanently deletes several trashed records in one request', async () => {
    const { agent, token } = await signedInAgent()
    const first = await createCertification(agent, token, 'Purge One')
    const second = await createCertification(agent, token, 'Purge Two')
    const ids = [first.body.certification.id, second.body.certification.id] as string[]

    for (const id of ids) {
      await agent
        .delete(`/api/admin/certifications/${id}`)
        .set('x-csrf-token', token)
        .expect(204)
    }

    const purged = await agent
      .post('/api/admin/trash/purge')
      .set('x-csrf-token', token)
      .send({ items: ids.map((id) => ({ type: 'certification', id })) })
      .expect(200)
    expect(purged.body).toEqual({ purged: 2 })

    expect(await prisma.certification.count({ where: { id: { in: ids } } })).toBe(0)
    expect((await agent.get('/api/admin/trash').expect(200)).body.total).toBe(0)

    const audits = await prisma.auditEvent.findMany({
      where: { action: 'CERTIFICATION_PURGED' },
    })
    expect(audits).toHaveLength(2)
  })

  it('is atomic when any selected record is not in the trash', async () => {
    const { agent, token } = await signedInAgent()
    const trashedProject = await createProject(agent, token, { title: 'Trashed project' })
    const liveSkill = await createSkill(agent, token, 'Live skill')
    const trashedId = trashedProject.body.project.id as string
    const liveId = liveSkill.body.skill.id as string

    await agent.delete(`/api/admin/projects/${trashedId}`).set('x-csrf-token', token).expect(204)

    const mixed = [
      { type: 'project', id: trashedId },
      { type: 'skill', id: liveId },
    ]

    await agent
      .post('/api/admin/trash/restore')
      .set('x-csrf-token', token)
      .send({ items: mixed })
      .expect(409)
    expect(await prisma.project.count({ where: { id: trashedId, deletedAt: { not: null } } })).toBe(1)

    await agent
      .post('/api/admin/trash/purge')
      .set('x-csrf-token', token)
      .send({ items: mixed })
      .expect(409)
    expect(await prisma.project.count({ where: { id: trashedId } })).toBe(1)
    expect(await prisma.skill.count({ where: { id: liveId } })).toBe(1)
  })

  it('rejects malformed bulk trash payloads', async () => {
    const { agent, token } = await signedInAgent()

    await agent
      .post('/api/admin/trash/restore')
      .set('x-csrf-token', token)
      .send({ items: [] })
      .expect(400)

    await agent
      .post('/api/admin/trash/purge')
      .set('x-csrf-token', token)
      .send({ items: Array.from({ length: 51 }, () => ({ type: 'project', id: 'x' })) })
      .expect(400)

    await agent
      .post('/api/admin/trash/restore')
      .set('x-csrf-token', token)
      .send({ items: [{ type: 'unknown', id: 'x' }] })
      .expect(400)

    await agent
      .post('/api/admin/trash/purge')
      .set('x-csrf-token', token)
      .send({ items: [{ type: 'project', id: 'x', extra: true }] })
      .expect(400)

    await request(app)
      .post('/api/admin/trash/restore')
      .send({ items: [{ type: 'project', id: 'x' }] })
      .expect(403)

    const agentWithoutCsrf = request.agent(app)
    const loginToken = await csrfToken(agentWithoutCsrf)
    await agentWithoutCsrf
      .post('/api/auth/login')
      .set('x-csrf-token', loginToken)
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
      .expect(200)
    await agentWithoutCsrf
      .post('/api/admin/trash/restore')
      .send({ items: [{ type: 'project', id: 'x' }] })
      .expect(403)
  })

  it('keeps a trashed slug reserved until the record is purged', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, {
      title: 'Reserved slug',
      slug: 'reserved-slug',
    })
    const id = created.body.project.id as string

    await agent.delete(`/api/admin/projects/${id}`).set('x-csrf-token', token).expect(204)

    const blocked = await createProject(agent, token, {
      title: 'New project',
      slug: 'reserved-slug',
    }).expect(409)
    expect(blocked.body.error).toBe('conflict')

    await agent.delete(`/api/admin/trash/project/${id}`).set('x-csrf-token', token).expect(204)

    await createProject(agent, token, {
      title: 'New project',
      slug: 'reserved-slug',
    }).expect(201)
  })
})

describe('revision history', () => {
  it('stores a snapshot for every create and update', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, { title: 'Revision project' })
    const id = created.body.project.id as string

    await agent
      .patch(`/api/admin/projects/${id}`)
      .set('x-csrf-token', token)
      .send({ title: 'Revision project renamed' })
      .expect(200)

    const list = await agent
      .get(`/api/admin/revisions?entityType=Project&entityId=${id}`)
      .expect(200)

    expect(list.body.total).toBe(2)
    expect(list.body.items[0]).toMatchObject({ action: 'UPDATED', entityId: id })
    expect(list.body.items[1]).toMatchObject({ action: 'CREATED', entityId: id })

    const revisionId = list.body.items[1].id as string
    const detail = await agent.get(`/api/admin/revisions/${revisionId}`).expect(200)
    expect(detail.body.revision.snapshot).toMatchObject({ title: 'Revision project' })
    // The first snapshot has no earlier version to compare against.
    expect(detail.body.revision.previous).toBeNull()

    const latest = await agent.get(`/api/admin/revisions/${list.body.items[0].id}`).expect(200)
    expect(latest.body.revision.snapshot).toMatchObject({ title: 'Revision project renamed' })
    expect(latest.body.revision.previous).toMatchObject({
      id: revisionId,
      action: 'CREATED',
      snapshot: { title: 'Revision project' },
    })
  })

  it('restores an earlier snapshot and records the restoration', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, { title: 'Original title' })
    const id = created.body.project.id as string

    const before = await agent
      .get(`/api/admin/revisions?entityType=Project&entityId=${id}`)
      .expect(200)
    const originalRevision = before.body.items[0].id as string

    await agent
      .patch(`/api/admin/projects/${id}`)
      .set('x-csrf-token', token)
      .send({ title: 'Changed title', featured: true })
      .expect(200)

    await agent
      .post(`/api/admin/revisions/${originalRevision}/restore`)
      .set('x-csrf-token', token)
      .expect(200)

    const restored = await agent.get(`/api/admin/projects/${id}`).expect(200)
    expect(restored.body.project.title).toBe('Original title')
    expect(restored.body.project.featured).toBe(false)

    const after = await agent
      .get(`/api/admin/revisions?entityType=Project&entityId=${id}`)
      .expect(200)
    expect(after.body.total).toBe(3)

    const audits = await prisma.auditEvent.findMany({ where: { action: 'REVISION_RESTORED' } })
    expect(audits).toHaveLength(1)
    expect(audits[0]?.metadata).toMatchObject({ revisionId: originalRevision })
  })

  it('refuses to restore a revision while the record is in the trash', async () => {
    const { agent, token } = await signedInAgent()
    const created = await createProject(agent, token, { title: 'Trashed revision project' })
    const id = created.body.project.id as string

    const list = await agent
      .get(`/api/admin/revisions?entityType=Project&entityId=${id}`)
      .expect(200)
    const revisionId = list.body.items[0].id as string

    await agent.delete(`/api/admin/projects/${id}`).set('x-csrf-token', token).expect(204)

    const blocked = await agent
      .post(`/api/admin/revisions/${revisionId}/restore`)
      .set('x-csrf-token', token)
      .expect(409)
    expect(blocked.body.error).toBe('conflict')
  })
})
