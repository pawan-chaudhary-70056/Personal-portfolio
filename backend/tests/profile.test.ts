import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100 })

let passwordHash = ''

const validProfile = {
  displayName: 'Aarav Sharma',
  headline: 'Software engineer and application security specialist',
  biography:
    'Builds secure, accessible web applications with an emphasis on maintainable systems and clear interfaces.',
  location: 'Kathmandu, Nepal',
  publicEmail: 'hello@example.com',
  websiteUrl: 'https://example.com',
  linkedinUrl: 'https://www.linkedin.com/in/example',
  githubUrl: 'https://github.com/example',
  portraitUrl: 'https://example.com/portrait.jpg',
  portraitAlt: 'Portrait of Aarav Sharma',
}

const PUBLIC_PROFILE_KEYS = [
  'biography',
  'displayName',
  'githubUrl',
  'headline',
  'linkedinUrl',
  'location',
  'portraitAlt',
  'portraitUrl',
  'publicEmail',
  'websiteUrl',
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
    .set('user-agent', 'Vitest Browser')
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
    .expect(200)
  return agent
}

function patchProfile(
  agent: TestAgent,
  token: string,
  body: Record<string, unknown> = validProfile,
) {
  return agent.patch('/api/admin/profile').set('x-csrf-token', token).send(body)
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

describe('profile', () => {
  it('requires authentication and CSRF for administrative access', async () => {
    await request(app).get('/api/admin/profile').expect(401)
    await request(app).patch('/api/admin/profile').send(validProfile).expect(403)

    const anonymous = request.agent(app)
    const token = await csrfToken(anonymous)
    await anonymous
      .patch('/api/admin/profile')
      .set('x-csrf-token', token)
      .send(validProfile)
      .expect(401)

    // The public read is intentionally open and returns an empty state.
    const publicResponse = await request(app).get('/api/profile').expect(200)
    expect(publicResponse.body).toEqual({ profile: null })
  })

  it('reports an empty state before the profile is initialised', async () => {
    const agent = await signedInAgent()

    const adminResponse = await agent.get('/api/admin/profile').expect(200)
    expect(adminResponse.body.profile).toBeNull()

    const publicResponse = await request(app).get('/api/profile').expect(200)
    expect(publicResponse.body.profile).toBeNull()
    await expect(prisma.profile.count()).resolves.toBe(0)
  })

  it('creates the singleton profile and publishes only allowlisted fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    const response = await patchProfile(agent, token).expect(200)

    expect(response.body.profile).toMatchObject({
      id: 'primary',
      displayName: validProfile.displayName,
      headline: validProfile.headline,
      biography: validProfile.biography,
      location: validProfile.location,
      publicEmail: validProfile.publicEmail,
      websiteUrl: validProfile.websiteUrl,
      linkedinUrl: validProfile.linkedinUrl,
      githubUrl: validProfile.githubUrl,
      portraitUrl: validProfile.portraitUrl,
      portraitAlt: validProfile.portraitAlt,
    })

    await expect(prisma.profile.count()).resolves.toBe(1)

    const publicResponse = await request(app).get('/api/profile').expect(200)
    expect(Object.keys(publicResponse.body.profile).sort()).toEqual(PUBLIC_PROFILE_KEYS)

    const serialized = JSON.stringify(publicResponse.body)
    expect(serialized).not.toContain('passwordHash')
    expect(serialized).not.toContain('createdAt')
    expect(serialized).not.toContain('updatedAt')

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'PROFILE_UPDATED' },
    })
    expect(audit?.entityType).toBe('Profile')
    expect(audit?.entityId).toBe('primary')
    expect(audit?.metadata).toMatchObject({ created: true })
    expect(JSON.stringify(audit?.metadata)).not.toContain(validProfile.biography)

    const filteredAudit = await agent
      .get('/api/admin/audit-logs?entityType=Profile')
      .expect(200)
    expect(filteredAudit.body.total).toBe(1)
  })

  it('applies partial updates without clearing other fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await patchProfile(agent, token).expect(200)

    const updated = await patchProfile(agent, token, {
      headline: 'Principal engineer',
    }).expect(200)

    expect(updated.body.profile).toMatchObject({
      displayName: validProfile.displayName,
      biography: validProfile.biography,
      headline: 'Principal engineer',
    })
    await expect(prisma.profile.count()).resolves.toBe(1)

    const publicResponse = await request(app).get('/api/profile').expect(200)
    expect(publicResponse.body.profile.headline).toBe('Principal engineer')

    const latestAudit = await prisma.auditEvent.findFirst({
      where: { action: 'PROFILE_UPDATED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(latestAudit?.metadata).toMatchObject({ created: false })
  })

  it('validates the merged profile so single-field patches cannot bypass rules', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)

    await patchProfile(agent, token, {
      headline: 'Headline without the required identity fields',
    }).expect(400)

    const empty = await agent.get('/api/admin/profile').expect(200)
    expect(empty.body.profile).toBeNull()

    const created = await patchProfile(agent, token, {
      ...validProfile,
      portraitUrl: null,
      portraitAlt: null,
    }).expect(200)
    expect(created.body.profile.portraitUrl).toBeNull()

    const withoutAlt = await patchProfile(agent, token, {
      portraitUrl: 'https://example.com/new-portrait.jpg',
    }).expect(400)

    expect(
      (withoutAlt.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('portraitAlt')

    const partial = await agent.get('/api/admin/profile').expect(200)
    expect(partial.body.profile.portraitUrl).toBeNull()

    await patchProfile(agent, token, {
      portraitUrl: 'https://example.com/new-portrait.jpg',
      portraitAlt: 'Portrait of Aarav Sharma',
    }).expect(200)

    const emptied = await patchProfile(agent, token, { biography: '' }).expect(400)
    expect(
      (emptied.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('biography')
  })

  it('rejects invalid links, emails, identities, and unknown fields', async () => {
    const agent = await signedInAgent()
    const token = await csrfToken(agent)
    await patchProfile(agent, token).expect(200)

    const badUrl = await patchProfile(agent, token, {
      websiteUrl: 'ftp://example.com',
    }).expect(400)
    expect(
      (badUrl.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('websiteUrl')

    const javascriptUrl = await patchProfile(agent, token, {
      githubUrl: 'javascript:alert(1)',
    }).expect(400)
    expect(
      (javascriptUrl.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('githubUrl')

    const badEmail = await patchProfile(agent, token, {
      publicEmail: 'not-an-email',
    }).expect(400)
    expect(
      (badEmail.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('publicEmail')

    const blankName = await patchProfile(agent, token, { displayName: '   ' }).expect(400)
    expect(
      (blankName.body.details as Array<{ path: string }>).map((issue) => issue.path),
    ).toContain('displayName')

    await patchProfile(agent, token, {}).expect(400)
    await patchProfile(agent, token, { role: 'owner' }).expect(400)
  })
})
