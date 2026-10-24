import { Prisma } from '@prisma/client'
import request from 'supertest'
import type TestAgent from 'supertest/lib/agent.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import { generateTotpCode } from '../src/lib/mfa.js'
import { hashPassword } from '../src/lib/password.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, TEST_ADMIN_PASSWORD } from './config.js'

const app = createApp({ loginRateLimitMax: 100, mfaRateLimitMax: 1000 })

/** One TOTP step ahead: enrollment consumed the current step. */
const NEXT_STEP_MS = 30_000

let passwordHash = ''

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "MfaRecoveryCode", "MediaAsset", "HomepageSettings", "SiteSettings", "ProjectCategory", "SkillCategory", "Project", "AuditEvent", "Admin", "session", "Skill", "Experience", "Education", "Certification", "Profile", "ProjectScreenshot", "ContactMessage" RESTART IDENTITY CASCADE',
  )
}

async function csrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get('/api/auth/csrf').expect(200)
  return response.body.token as string
}

function login(agent: TestAgent, token: string) {
  return agent
    .post('/api/auth/login')
    .set('x-csrf-token', token)
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
}

async function signedInAgent(): Promise<{ agent: TestAgent; token: string }> {
  const agent = request.agent(app)
  const token = await csrfToken(agent)
  await login(agent, token).expect(200)
  return { agent, token: await csrfToken(agent) }
}

async function enrol(agent: TestAgent, token: string) {
  const setup = await agent
    .post('/api/admin/mfa/setup')
    .set('x-csrf-token', token)
    .expect(200)

  const secret = setup.body.setup.secret as string
  const enabled = await agent
    .post('/api/admin/mfa/enable')
    .set('x-csrf-token', token)
    .send({ code: generateTotpCode(secret) })
    .expect(200)

  return { secret, recoveryCodes: enabled.body.recoveryCodes as string[] }
}

async function startChallenge() {
  const agent = request.agent(app)
  const token = await csrfToken(agent)
  const response = await login(agent, token).expect(200)
  return { agent, token: await csrfToken(agent), response }
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

describe('administrator MFA', () => {
  it('enrols with a TOTP secret, stores it encrypted, and requires it at sign-in', async () => {
    const { agent, token } = await signedInAgent()

    const setup = await agent.post('/api/admin/mfa/setup').set('x-csrf-token', token).expect(200)
    expect(setup.body.setup.otpauthUri).toMatch(/^otpauth:\/\/totp\//)
    expect(setup.body.setup.secret).toMatch(/^[A-Z2-7]+$/)

    const stored = await prisma.admin.findUnique({ where: { email: TEST_ADMIN_EMAIL } })
    expect(stored?.mfaPendingSecret).toMatch(/^v1\./)
    expect(stored?.mfaPendingSecret).not.toContain(setup.body.setup.secret)

    const enabled = await agent
      .post('/api/admin/mfa/enable')
      .set('x-csrf-token', token)
      .send({ code: generateTotpCode(setup.body.setup.secret) })
      .expect(200)

    expect(enabled.body.recoveryCodes).toHaveLength(10)
    const secret = setup.body.setup.secret as string

    // Password alone no longer authenticates.
    const { agent: challengeAgent, token: challengeToken, response } = await startChallenge()
    expect(response.body).toEqual({ mfaRequired: true })
    await challengeAgent.get('/api/admin/mfa').expect(401)

    const wrong = await challengeAgent
      .post('/api/auth/mfa')
      .set('x-csrf-token', challengeToken)
      .send({ code: '000000' })
      .expect(401)
    expect(wrong.body.error).toBe('invalid_mfa_code')

    const verified = await challengeAgent
      .post('/api/auth/mfa')
      .set('x-csrf-token', challengeToken)
      .send({ code: generateTotpCode(secret, Date.now() + NEXT_STEP_MS) })
      .expect(200)
    expect(verified.body.admin.email).toBe(TEST_ADMIN_EMAIL)

    const status = await challengeAgent.get('/api/admin/mfa').expect(200)
    expect(status.body.mfa).toMatchObject({
      enabled: true,
      pendingSetup: false,
      recoveryCodesRemaining: 10,
    })

    const enabledEvent = await prisma.auditEvent.findFirst({ where: { action: 'MFA_ENABLED' } })
    expect(enabledEvent?.entityId).toBe(verified.body.admin.id)
    expect(await prisma.auditEvent.count({ where: { action: 'AUTH_MFA_CHALLENGE' } })).toBe(1)

    const mfaLogin = await prisma.auditEvent.findFirst({
      where: { action: 'AUTH_LOGIN_SUCCEEDED', metadata: { not: Prisma.DbNull } },
      orderBy: { createdAt: 'desc' },
    })
    expect(mfaLogin?.metadata).toMatchObject({ mfa: 'totp' })
  })

  it('revokes other sessions when MFA is enabled', async () => {
    const first = await signedInAgent()
    const second = await signedInAgent()

    await enrol(first.agent, first.token)

    await second.agent.get('/api/admin/mfa').expect(401)
    await first.agent.get('/api/admin/mfa').expect(200)
  })

  it('rejects a replayed authenticator code', async () => {
    const { agent, token } = await signedInAgent()
    const { secret } = await enrol(agent, token)
    const code = generateTotpCode(secret, Date.now() + NEXT_STEP_MS)

    const firstLogin = await startChallenge()
    await firstLogin.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', firstLogin.token)
      .send({ code })
      .expect(200)
    // Fetch the token before creating the request: a same-agent request started
    // while another is being built closes the agent's server in supertest.
    const logoutToken = await csrfToken(firstLogin.agent)
    await firstLogin.agent
      .post('/api/auth/logout')
      .set('x-csrf-token', logoutToken)
      .expect(204)

    const secondLogin = await startChallenge()
    const replay = await secondLogin.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', secondLogin.token)
      .send({ code })
      .expect(401)
    expect(replay.body.message).toContain('not valid')
  })

  it('accepts a recovery code once and rejects it afterwards', async () => {
    const { agent, token } = await signedInAgent()
    const { recoveryCodes } = await enrol(agent, token)

    const first = await startChallenge()
    await first.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', first.token)
      .send({ code: recoveryCodes[0] })
      .expect(200)

    const status = await first.agent.get('/api/admin/mfa').expect(200)
    expect(status.body.mfa.recoveryCodesRemaining).toBe(9)

    const logoutToken = await csrfToken(first.agent)
    await first.agent
      .post('/api/auth/logout')
      .set('x-csrf-token', logoutToken)
      .expect(204)

    const second = await startChallenge()
    await second.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', second.token)
      .send({ code: recoveryCodes[0] })
      .expect(401)

    await second.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', second.token)
      .send({ code: recoveryCodes[1] })
      .expect(200)
  })

  it('drops the challenge after five incorrect codes', async () => {
    const { agent, token } = await signedInAgent()
    const { secret } = await enrol(agent, token)

    const challenge = await startChallenge()

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await challenge.agent
        .post('/api/auth/mfa')
        .set('x-csrf-token', challenge.token)
        .send({ code: '123456' })
        .expect(401)
      expect(response.body.error).toBe('invalid_mfa_code')
    }

    const afterLockout = await challenge.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', challenge.token)
      .send({ code: generateTotpCode(secret, Date.now() + NEXT_STEP_MS) })
      .expect(401)
    expect(afterLockout.body.message).toContain('Sign in with your password')

    const failure = await prisma.auditEvent.findFirst({
      where: { action: 'AUTH_MFA_FAILED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(failure?.metadata).toMatchObject({ attempts: 5, lockedOut: true })
  })

  it('requires the password and a code to disable, then signs in without MFA', async () => {
    const { agent, token } = await signedInAgent()
    const { secret } = await enrol(agent, token)

    const wrongPassword = await agent
      .post('/api/admin/mfa/disable')
      .set('x-csrf-token', token)
      .send({ password: 'not-the-password', code: generateTotpCode(secret, Date.now() + NEXT_STEP_MS) })
      .expect(400)
    expect(wrongPassword.body.error).toBe('invalid_password')

    await agent
      .post('/api/admin/mfa/disable')
      .set('x-csrf-token', token)
      .send({
        password: TEST_ADMIN_PASSWORD,
        code: generateTotpCode(secret, Date.now() + NEXT_STEP_MS),
      })
      .expect(204)

    const status = await agent.get('/api/admin/mfa').expect(200)
    expect(status.body.mfa).toMatchObject({ enabled: false, recoveryCodesRemaining: 0 })

    const direct = await startChallenge()
    expect(direct.response.body.admin.email).toBe(TEST_ADMIN_EMAIL)
    expect(await prisma.mfaRecoveryCode.count()).toBe(0)
    expect(
      await prisma.auditEvent.count({ where: { action: 'MFA_DISABLED' } }),
    ).toBe(1)
  })

  it('regenerates recovery codes and invalidates the old set', async () => {
    const { agent, token } = await signedInAgent()
    const { secret, recoveryCodes } = await enrol(agent, token)

    const regenerated = await agent
      .post('/api/admin/mfa/recovery-codes')
      .set('x-csrf-token', token)
      .send({
        password: TEST_ADMIN_PASSWORD,
        code: generateTotpCode(secret, Date.now() + NEXT_STEP_MS),
      })
      .expect(200)

    const fresh = regenerated.body.recoveryCodes as string[]
    expect(fresh).toHaveLength(10)
    expect(fresh).not.toEqual(recoveryCodes)

    const challenge = await startChallenge()
    await challenge.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', challenge.token)
      .send({ code: recoveryCodes[0] })
      .expect(401)

    await challenge.agent
      .post('/api/auth/mfa')
      .set('x-csrf-token', challenge.token)
      .send({ code: fresh[0] })
      .expect(200)
  })

  it('protects MFA management and refuses double enrolment', async () => {
    await request(app).get('/api/admin/mfa').expect(401)

    const agent = request.agent(app)
    const token = await csrfToken(agent)
    await agent.post('/api/admin/mfa/setup').set('x-csrf-token', token).expect(401)
    await agent.post('/api/admin/mfa/setup').expect(403)

    const signedIn = await signedInAgent()
    await enrol(signedIn.agent, signedIn.token)

    const again = await signedIn.agent
      .post('/api/admin/mfa/setup')
      .set('x-csrf-token', signedIn.token)
      .expect(409)
    expect(again.body.error).toBe('conflict')

    // A challenge session cannot manage MFA either.
    const challenge = await startChallenge()
    await challenge.agent
      .post('/api/admin/mfa/disable')
      .set('x-csrf-token', challenge.token)
      .send({ password: TEST_ADMIN_PASSWORD, code: '123456' })
      .expect(401)
  })
})
