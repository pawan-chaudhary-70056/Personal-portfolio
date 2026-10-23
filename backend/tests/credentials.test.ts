import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

let passwordHash = ''

const educationEntry = {
  institution: 'Tribhuvan University',
  qualification: 'BSc Computer Science',
  fieldOfStudy: 'Computer Science',
  description: 'Focused on distributed systems, databases, and application security.',
  startDate: '2019-08-01',
  endDate: '2023-06-30',
}

const certificationEntry = {
  name: 'Certified Kubernetes Administrator',
  issuingOrganization: 'Cloud Native Computing Foundation',
  issueDate: '2025-01-15',
  expiryDate: '2028-01-15',
  credentialId: 'CKA-12345',
  credentialUrl: 'https://training.linuxfoundation.org/certification/verify',
}

const PUBLIC_EDUCATION_KEYS = [
  'description',
  'endDate',
  'fieldOfStudy',
  'id',
  'institution',
  'qualification',
  'sortOrder',
  'startDate',
].sort()

const PUBLIC_CERTIFICATION_KEYS = [
  'credentialId',
  'credentialUrl',
  'expiryDate',
  'id',
  'issueDate',
  'issuingOrganization',
  'name',
  'sortOrder',
].sort()

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

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_ADMIN_PASSWORD)
})

beforeEach(async () => {
  await resetDatabase()
  await prisma.admin.create({
    data: { email: TEST_ADMIN_EMAIL, name: TEST_ADMIN_NAME, passwordHash, role: 'OWNER' },
  })
})

describe('education', () => {
  it('requires authentication and CSRF', async () => {
    await request(app).get('/api/admin/education').expect(401)
    await request(app).post('/api/admin/education').send(educationEntry).expect(403)

    const agent = await signedInAgent()
    await agent.post('/api/admin/education').send(educationEntry).expect(403)

    await request(app).get('/api/education').expect(200).expect({ education: [] })
  })

  it('creates, publishes, hides, searches, and deletes an entry', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/education')
      .set('x-csrf-token', token)
      .send(educationEntry)
      .expect(201)

    const id = created.body.education.id as string
    expect(created.body.education).toMatchObject({
      institution: educationEntry.institution,
      qualification: educationEntry.qualification,
      fieldOfStudy: educationEntry.fieldOfStudy,
      description: educationEntry.description,
      published: true,
      sortOrder: 0,
    })
    // Prisma date-only columns are serialised as UTC ISO timestamps.
    expect(created.body.education.startDate).toBe('2019-08-01T00:00:00.000Z')
    expect(created.body.education.endDate).toBe('2023-06-30T00:00:00.000Z')

    const published = await request(app).get('/api/education').expect(200)
    expect(published.body.education).toHaveLength(1)
    expect(published.body.education[0]).toMatchObject({
      institution: educationEntry.institution,
      qualification: educationEntry.qualification,
    })
    expect(Object.keys(published.body.education[0]).sort()).toEqual(PUBLIC_EDUCATION_KEYS)

    await agent
      .patch(`/api/admin/education/${id}`)
      .set('x-csrf-token', token)
      .send({ published: false })
      .expect(200)

    await request(app).get('/api/education').expect(200).expect({ education: [] })

    const hiddenList = await agent.get('/api/admin/education').expect(200)
    expect(hiddenList.body.education[0].published).toBe(false)

    const updated = await agent
      .patch(`/api/admin/education/${id}`)
      .set('x-csrf-token', token)
      .send({ published: true, qualification: 'MSc Computer Science' })
      .expect(200)
    expect(updated.body.education.qualification).toBe('MSc Computer Science')

    const search = await agent
      .get('/api/admin/education?search=Tribhuvan')
      .expect(200)
    expect(search.body.education).toHaveLength(1)

    const filteredAudit = await agent
      .get('/api/admin/audit-logs?entityType=Education')
      .expect(200)
    expect(filteredAudit.body.total).toBe(3)

    await agent
      .delete(`/api/admin/education/${id}`)
      .set('x-csrf-token', token)
      .expect(204)

    await request(app).get('/api/education').expect(200).expect({ education: [] })
    const afterDelete = await agent.get('/api/admin/education').expect(200)
    expect(afterDelete.body.education).toEqual([])

    const deletedAudit = await prisma.auditEvent.findFirst({
      where: { action: 'EDUCATION_DELETED' },
    })
    expect(deletedAudit?.entityId).toBe(id)
  })

  it('validates date order for creation and merged updates', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const invalid = await agent
      .post('/api/admin/education')
      .set('x-csrf-token', token)
      .send({ ...educationEntry, startDate: '2024-01-01', endDate: '2023-01-01' })
      .expect(400)

    expect(
      (invalid.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('endDate')

    const created = await agent
      .post('/api/admin/education')
      .set('x-csrf-token', token)
      .send(educationEntry)
      .expect(201)

    const id = created.body.education.id as string

    const mergedInvalid = await agent
      .patch(`/api/admin/education/${id}`)
      .set('x-csrf-token', token)
      .send({ startDate: '2024-01-01' })
      .expect(400)

    // The missing end date is inherited from the stored record (2023-06-30).
    expect(
      (mergedInvalid.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('endDate')

    await agent
      .patch(`/api/admin/education/${id}`)
      .set('x-csrf-token', token)
      .send({ endDate: '2025-06-30' })
      .expect(200)

    const impossibleDate = await agent
      .patch(`/api/admin/education/${id}`)
      .set('x-csrf-token', token)
      .send({ startDate: '2025-02-31' })
      .expect(400)

    expect(
      (impossibleDate.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('startDate')
  })
})

describe('certifications', () => {
  it('requires authentication and CSRF', async () => {
    await request(app).get('/api/admin/certifications').expect(401)
    await request(app).post('/api/admin/certifications').send(certificationEntry).expect(403)
    await request(app).get('/api/certifications').expect(200).expect({ certifications: [] })
  })

  it('manages credentials and public visibility', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const created = await agent
      .post('/api/admin/certifications')
      .set('x-csrf-token', token)
      .send(certificationEntry)
      .expect(201)

    const id = created.body.certification.id as string

    const published = await request(app).get('/api/certifications').expect(200)
    expect(published.body.certifications).toHaveLength(1)
    expect(Object.keys(published.body.certifications[0]).sort()).toEqual(
      PUBLIC_CERTIFICATION_KEYS,
    )
    expect(published.body.certifications[0]).toMatchObject({
      name: certificationEntry.name,
      issuingOrganization: certificationEntry.issuingOrganization,
      credentialId: certificationEntry.credentialId,
    })

    const badUrl = await agent
      .patch(`/api/admin/certifications/${id}`)
      .set('x-csrf-token', token)
      .send({ credentialUrl: 'javascript:alert(1)' })
      .expect(400)
    expect(
      (badUrl.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('credentialUrl')

    const badDates = await agent
      .patch(`/api/admin/certifications/${id}`)
      .set('x-csrf-token', token)
      .send({ expiryDate: '2024-01-01' })
      .expect(400)
    expect(
      (badDates.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('expiryDate')

    await agent
      .patch(`/api/admin/certifications/${id}`)
      .set('x-csrf-token', token)
      .send({ published: false })
      .expect(200)
    await request(app).get('/api/certifications').expect(200).expect({ certifications: [] })

    const search = await agent
      .get('/api/admin/certifications?search=Cloud Native')
      .expect(200)
    expect(search.body.certifications).toHaveLength(1)

    await agent
      .delete(`/api/admin/certifications/${id}`)
      .set('x-csrf-token', token)
      .expect(204)
    await request(app).get('/api/certifications').expect(200).expect({ certifications: [] })
  })

  it('rejects expiry dates before the issue date on create', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await agent
      .post('/api/admin/certifications')
      .set('x-csrf-token', token)
      .send({ ...certificationEntry, expiryDate: '2024-01-01' })
      .expect(400)

    expect(
      (response.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('expiryDate')
  })

  it('reports credential counts on the overview', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const publishedEducation = await agent
      .post('/api/admin/education')
      .set('x-csrf-token', token)
      .send(educationEntry)
      .expect(201)

    const hiddenEducation = await agent
      .post('/api/admin/education')
      .set('x-csrf-token', token)
      .send({ ...educationEntry, institution: 'Hidden University', published: false })
      .expect(201)

    expect(publishedEducation.body.education.published).toBe(true)
    expect(hiddenEducation.body.education.published).toBe(false)

    await agent
      .post('/api/admin/certifications')
      .set('x-csrf-token', token)
      .send(certificationEntry)
      .expect(201)

    const overview = await agent.get('/api/admin/overview').expect(200)

    expect(overview.body.content.education).toEqual({ total: 2, published: 1 })
    expect(overview.body.content.certifications).toEqual({ total: 1, published: 1 })
  })
})
