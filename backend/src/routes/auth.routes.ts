import { Router, type Request } from 'express'
import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import { decryptSecret } from '../lib/mfa.js'
import { ApiError, unauthorized } from '../lib/errors.js'
import { burnPasswordCheck, verifyPassword } from '../lib/password.js'
import { parseInput } from '../lib/validate.js'
import { issueCsrfToken } from '../middleware/csrf.js'
import { loginSchema } from '../schemas/auth.schema.js'
import { mfaCodeSchema } from '../schemas/mfa.schema.js'
import {
  MFA_CHALLENGE_TTL_MS,
  MFA_MAX_ATTEMPTS,
  getSecondFactorCandidate,
  verifySecondFactor,
} from '../services/mfa.service.js'

export interface AuthRouterOptions {
  /** Lowered in tests so the limiter can be exercised without long waits. */
  loginRateLimitMax?: number
  /** Second-factor attempts allowed per window, lowered in tests. */
  mfaRateLimitMax?: number
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()))
  })
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()))
  })
}

const loginFailed = () =>
  new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.')

export function createAuthRouter(options: AuthRouterOptions = {}): Router {
  const router = Router()

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.loginRateLimitMax ?? 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: 'rate_limited',
      message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
    },
  })

  const mfaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.mfaRateLimitMax ?? 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: 'rate_limited',
      message: 'Too many code attempts. Please wait a few minutes and try again.',
    },
  })

  router.get('/csrf', issueCsrfToken)

  router.post('/login', loginLimiter, async (req, res) => {
    const input = parseInput(loginSchema, req.body)
    const admin = await prisma.admin.findUnique({ where: { email: input.email } })

    if (!admin || !admin.isActive) {
      await burnPasswordCheck(input.password)
      await recordAudit({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'Admin',
        metadata: { email: input.email, reason: 'unknown_account' },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
      throw loginFailed()
    }

    const passwordMatches = await verifyPassword(admin.passwordHash, input.password)

    if (!passwordMatches) {
      await recordAudit({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'Admin',
        entityId: admin.id,
        metadata: { email: admin.email, reason: 'bad_password' },
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
      throw loginFailed()
    }

    // Rotate the session identifier to prevent session fixation.
    await regenerateSession(req)

    if (admin.mfaEnabled) {
      // The password is correct but the session stays unauthenticated until the
      // second factor is verified; requireAdmin rejects it meanwhile.
      req.session.pendingMfaAdminId = admin.id
      req.session.pendingMfaAt = Date.now()
      req.session.pendingMfaAttempts = 0
      await saveSession(req)

      await recordAudit({
        action: 'AUTH_MFA_CHALLENGE',
        entityType: 'Admin',
        entityId: admin.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })

      res.json({ mfaRequired: true })
      return
    }

    req.session.adminId = admin.id
    req.session.loggedInAt = Date.now()
    // Stored so the dashboard can describe a session without exposing its id.
    req.session.userAgent = req.get('user-agent')?.slice(0, 300)
    await saveSession(req)

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    await recordAudit({
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'Admin',
      entityId: admin.id,
      adminId: admin.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } })
  })

  router.post('/mfa', mfaLimiter, async (req, res) => {
    const input = parseInput(mfaCodeSchema, req.body)
    const pendingId = req.session.pendingMfaAdminId
    const pendingAt = req.session.pendingMfaAt ?? 0
    const attempts = req.session.pendingMfaAttempts ?? 0

    if (!pendingId || !pendingAt) {
      throw unauthorized('Sign in with your password first.')
    }

    if (Date.now() - pendingAt > MFA_CHALLENGE_TTL_MS) {
      await destroySession(req)
      throw unauthorized('Your sign-in attempt expired. Please sign in again.')
    }

    const admin = await getSecondFactorCandidate(pendingId)

    if (!admin || !admin.isActive || !admin.mfaEnabled) {
      await destroySession(req)
      throw unauthorized('Your session is no longer valid. Please sign in again.')
    }

    const method = await verifySecondFactor(admin.id, decryptSecret(admin.mfaSecret), input.code)

    if (!method) {
      const nextAttempts = attempts + 1
      const lockedOut = nextAttempts >= MFA_MAX_ATTEMPTS

      if (lockedOut) {
        await destroySession(req)
      } else {
        req.session.pendingMfaAttempts = nextAttempts
        await saveSession(req)
      }

      await recordAudit({
        action: 'AUTH_MFA_FAILED',
        entityType: 'Admin',
        entityId: admin.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { attempts: nextAttempts, lockedOut },
      })

      throw new ApiError(
        401,
        'invalid_mfa_code',
        lockedOut
          ? 'Too many incorrect codes. Sign in again.'
          : `That code is not valid. ${MFA_MAX_ATTEMPTS - nextAttempts} attempts left.`,
      )
    }

    await regenerateSession(req)
    req.session.adminId = admin.id
    req.session.loggedInAt = Date.now()
    req.session.userAgent = req.get('user-agent')?.slice(0, 300)
    await saveSession(req)

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    await recordAudit({
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'Admin',
      entityId: admin.id,
      adminId: admin.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { mfa: method },
    })

    res.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } })
  })

  router.post('/logout', async (req, res) => {
    const adminId = req.session.adminId

    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error) => (error ? reject(error) : resolve()))
    })

    res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' })

    if (adminId) {
      await recordAudit({
        action: 'AUTH_LOGOUT',
        entityType: 'Admin',
        entityId: adminId,
        adminId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
    }

    res.status(204).end()
  })

  router.get('/session', async (req, res) => {
    const adminId = req.session.adminId

    if (!adminId) {
      throw unauthorized('Not signed in.')
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    if (!admin || !admin.isActive) {
      req.session.destroy(() => undefined)
      throw unauthorized('Not signed in.')
    }

    res.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } })
  })

  return router
}
