import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { ApiError, conflict, notFound, unauthorized } from '../lib/errors.js'
import {
  TOTP_DIGITS,
  TOTP_ISSUER,
  TOTP_PERIOD_SECONDS,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  normalizeRecoveryCode,
  normalizeTotpCode,
  otpauthUri,
  verifyTotpCode,
} from '../lib/mfa.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import type { MfaPasswordCodeInput } from '../schemas/mfa.schema.js'

/** A password-verified sign-in waits this long for the second factor. */
export const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000
/** Wrong codes allowed per challenge before the pending session is dropped. */
export const MFA_MAX_ATTEMPTS = 5

export interface MfaStatus {
  enabled: boolean
  enabledAt: string | null
  pendingSetup: boolean
  recoveryCodesRemaining: number
}

function invalidCode(
  message = 'That code is not valid. Try the next code from your authenticator app.',
) {
  return new ApiError(400, 'invalid_mfa_code', message, [{ path: 'code', message }])
}

function wrongPassword() {
  return new ApiError(400, 'invalid_password', 'Your password is incorrect.', [
    { path: 'password', message: 'Your password is incorrect.' },
  ])
}

/** Keeps the browser that made the change signed in and drops the rest. */
async function revokeOtherSessions(
  tx: Prisma.TransactionClient,
  adminId: string,
  currentSid?: string,
): Promise<void> {
  if (currentSid) {
    await tx.$executeRaw`DELETE FROM "session" WHERE sess ->> 'adminId' = ${adminId} AND sid <> ${currentSid}`
    return
  }

  await tx.$executeRaw`DELETE FROM "session" WHERE sess ->> 'adminId' = ${adminId}`
}

export async function getMfaStatus(adminId: string): Promise<MfaStatus> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { mfaEnabled: true, mfaEnabledAt: true, mfaPendingSecret: true },
  })

  if (!admin) {
    throw notFound('Administrator')
  }

  const recoveryCodesRemaining = admin.mfaEnabled
    ? await prisma.mfaRecoveryCode.count({ where: { adminId, usedAt: null } })
    : 0

  return {
    enabled: admin.mfaEnabled,
    enabledAt: admin.mfaEnabledAt?.toISOString() ?? null,
    pendingSetup: Boolean(admin.mfaPendingSecret),
    recoveryCodesRemaining,
  }
}

export async function startMfaSetup(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { email: true, mfaEnabled: true },
  })

  if (!admin) {
    throw notFound('Administrator')
  }

  if (admin.mfaEnabled) {
    throw conflict('Two-factor authentication is already enabled. Disable it first to re-enroll.')
  }

  const secret = generateTotpSecret()

  await prisma.admin.update({
    where: { id: adminId },
    data: { mfaPendingSecret: encryptSecret(secret) },
  })

  return {
    secret,
    otpauthUri: otpauthUri(secret, admin.email),
    issuer: TOTP_ISSUER,
    digits: TOTP_DIGITS,
    periodSeconds: TOTP_PERIOD_SECONDS,
  }
}

/**
 * Verifies a six-digit authenticator code or a recovery code. TOTP steps are
 * consumed so the same code cannot be used twice; recovery codes are marked used.
 */
export async function verifySecondFactor(
  adminId: string,
  secret: string | null,
  code: string,
): Promise<'totp' | 'recovery' | null> {
  const normalized = normalizeTotpCode(code)

  if (/^\d{6}$/.test(normalized)) {
    if (!secret) {
      return null
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { mfaLastUsedStep: true },
    })

    const result = verifyTotpCode(secret, normalized, {
      afterStep: admin?.mfaLastUsedStep ?? null,
    })

    if (!result.ok) {
      return null
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { mfaLastUsedStep: result.step },
    })

    return 'totp'
  }

  const recovery = normalizeRecoveryCode(code)

  if (recovery.length < 8) {
    return null
  }

  const rows = await prisma.mfaRecoveryCode.findMany({
    where: { adminId, usedAt: null },
    select: { id: true, codeHash: true },
  })

  for (const row of rows) {
    if (await verifyPassword(row.codeHash, recovery)) {
      await prisma.mfaRecoveryCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      })
      return 'recovery'
    }
  }

  return null
}

export interface SecondFactorCandidate {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'EDITOR'
  isActive: boolean
  mfaEnabled: boolean
  mfaSecret: string | null
}

/** Admin fields needed to complete a pending MFA challenge. */
export async function getSecondFactorCandidate(
  adminId: string,
): Promise<SecondFactorCandidate | null> {
  return prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mfaEnabled: true,
      mfaSecret: true,
    },
  })
}

export async function enableMfa(
  adminId: string,
  code: string,
  ctx: RequestContext,
  currentSid?: string,
) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { mfaEnabled: true, mfaPendingSecret: true },
  })

  if (!admin) {
    throw notFound('Administrator')
  }

  if (admin.mfaEnabled) {
    throw conflict('Two-factor authentication is already enabled.')
  }

  const secret = decryptSecret(admin.mfaPendingSecret)

  if (!secret) {
    throw conflict('Start the setup again to generate a new key.')
  }

  const verification = verifyTotpCode(secret, code)

  if (!verification.ok) {
    throw invalidCode()
  }

  const recoveryCodes = generateRecoveryCodes()
  // Stored hashes are of the normalized value, which is what a sign-in compares.
  const hashes = await Promise.all(
    recoveryCodes.map((code) => hashPassword(normalizeRecoveryCode(code))),
  )

  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { adminId } })
    await tx.mfaRecoveryCode.createMany({
      data: hashes.map((codeHash) => ({ adminId, codeHash })),
    })

    await tx.admin.update({
      where: { id: adminId },
      data: {
        mfaEnabled: true,
        mfaEnabledAt: new Date(),
        mfaSecret: encryptSecret(secret),
        mfaPendingSecret: null,
        // The enrollment code cannot be reused at sign-in.
        mfaLastUsedStep: verification.step,
      },
    })

    await revokeOtherSessions(tx, adminId, currentSid)

    await recordAudit(
      {
        action: 'MFA_ENABLED',
        entityType: 'Admin',
        entityId: adminId,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { recoveryCodes: recoveryCodes.length, sessionsRevoked: true },
      },
      tx,
    )
  })

  return { recoveryCodes }
}

export async function disableMfa(
  adminId: string,
  input: MfaPasswordCodeInput,
  ctx: RequestContext,
  currentSid?: string,
) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { passwordHash: true, mfaEnabled: true, mfaSecret: true },
  })

  if (!admin) {
    throw notFound('Administrator')
  }

  if (!admin.mfaEnabled) {
    throw conflict('Two-factor authentication is not enabled.')
  }

  if (!(await verifyPassword(admin.passwordHash, input.password))) {
    throw wrongPassword()
  }

  const method = await verifySecondFactor(adminId, decryptSecret(admin.mfaSecret), input.code)

  if (!method) {
    throw invalidCode()
  }

  await prisma.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id: adminId },
      data: {
        mfaEnabled: false,
        mfaEnabledAt: null,
        mfaSecret: null,
        mfaPendingSecret: null,
        mfaLastUsedStep: null,
      },
    })

    await tx.mfaRecoveryCode.deleteMany({ where: { adminId } })
    await revokeOtherSessions(tx, adminId, currentSid)

    await recordAudit(
      {
        action: 'MFA_DISABLED',
        entityType: 'Admin',
        entityId: adminId,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { method, sessionsRevoked: true },
      },
      tx,
    )
  })
}

export async function regenerateRecoveryCodes(
  adminId: string,
  input: MfaPasswordCodeInput,
  ctx: RequestContext,
) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { passwordHash: true, mfaEnabled: true, mfaSecret: true },
  })

  if (!admin) {
    throw notFound('Administrator')
  }

  if (!admin.mfaEnabled) {
    throw conflict('Two-factor authentication is not enabled.')
  }

  if (!(await verifyPassword(admin.passwordHash, input.password))) {
    throw wrongPassword()
  }

  const normalized = normalizeTotpCode(input.code)

  if (!/^\d{6}$/.test(normalized)) {
    throw invalidCode('Use the 6-digit code from your authenticator app.')
  }

  const current = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { mfaLastUsedStep: true },
  })

  const verification = verifyTotpCode(decryptSecret(admin.mfaSecret) ?? '', normalized, {
    afterStep: current?.mfaLastUsedStep ?? null,
  })

  if (!verification.ok) {
    throw invalidCode()
  }

  const recoveryCodes = generateRecoveryCodes()
  const hashes = await Promise.all(
    recoveryCodes.map((code) => hashPassword(normalizeRecoveryCode(code))),
  )

  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { adminId } })
    await tx.mfaRecoveryCode.createMany({
      data: hashes.map((codeHash) => ({ adminId, codeHash })),
    })

    await tx.admin.update({
      where: { id: adminId },
      data: { mfaLastUsedStep: verification.step },
    })

    await recordAudit(
      {
        action: 'MFA_RECOVERY_CODES_REGENERATED',
        entityType: 'Admin',
        entityId: adminId,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { recoveryCodes: recoveryCodes.length },
      },
      tx,
    )
  })

  return { recoveryCodes }
}

/** Used by the sign-in challenge; rejects inactive or unenrolled accounts. */
export async function requireMfaCandidate(adminId: string): Promise<SecondFactorCandidate> {
  const admin = await getSecondFactorCandidate(adminId)

  if (!admin || !admin.isActive || !admin.mfaEnabled) {
    throw unauthorized('Your session is no longer valid. Please sign in again.')
  }

  return admin
}
