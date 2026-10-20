import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { conflict, notFound } from '../lib/errors.js'

interface StoredSessionData {
  adminId?: string
  loggedInAt?: number
  userAgent?: string
}

export interface AdminSessionSummary {
  /** Short, non-reversible fingerprint — never the session identifier. */
  id: string
  current: boolean
  createdAt: string | null
  expiresAt: string
  userAgent: string | null
}

/**
 * The session store keeps the raw identifier in its primary key. Only a short
 * hash is exposed so the dashboard can reference a session without ever
 * receiving a reusable credential (docs/13-admin-advanced-features.md §9.2).
 */
function fingerprint(sid: string): string {
  return createHash('sha256').update(sid).digest('hex').slice(0, 16)
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readSessionData(value: Prisma.JsonValue): StoredSessionData {
  const data = asRecord(value)
  return {
    adminId: typeof data.adminId === 'string' ? data.adminId : undefined,
    loggedInAt: typeof data.loggedInAt === 'number' ? data.loggedInAt : undefined,
    userAgent: typeof data.userAgent === 'string' ? data.userAgent : undefined,
  }
}

async function loadActiveSessions() {
  return prisma.session.findMany({
    where: { expire: { gt: new Date() } },
    select: { sid: true, sess: true, expire: true },
    orderBy: { expire: 'desc' },
  })
}

/** Lists only the signed-in administrator's own sessions. */
export async function listAdminSessions(
  adminId: string,
  currentSid: string,
): Promise<AdminSessionSummary[]> {
  const rows = await loadActiveSessions()

  return rows
    .map((row) => {
      const data = readSessionData(row.sess)

      if (data.adminId !== adminId) {
        return null
      }

      return {
        id: fingerprint(row.sid),
        current: row.sid === currentSid,
        createdAt: data.loggedInAt ? new Date(data.loggedInAt).toISOString() : null,
        expiresAt: row.expire.toISOString(),
        userAgent: data.userAgent ?? null,
      } satisfies AdminSessionSummary
    })
    .filter((session): session is AdminSessionSummary => session !== null)
    .sort((first, second) => {
      if (first.current !== second.current) {
        return first.current ? -1 : 1
      }
      return (second.createdAt ?? second.expiresAt).localeCompare(
        first.createdAt ?? first.expiresAt,
      )
    })
}

/**
 * Revokes one session owned by the current administrator. The current session
 * must be ended through sign-out so the caller cannot leave itself in a
 * half-signed-in state.
 */
export async function revokeSession(
  fingerprintId: string,
  adminId: string,
  currentSid: string,
  ctx: RequestContext,
): Promise<void> {
  const rows = await loadActiveSessions()

  const match = rows.find(
    (row) =>
      readSessionData(row.sess).adminId === adminId && fingerprint(row.sid) === fingerprintId,
  )

  if (!match) {
    throw notFound('Session')
  }

  if (match.sid === currentSid) {
    throw conflict('Use sign out to end the current session.')
  }

  await prisma.session.delete({ where: { sid: match.sid } })

  await recordAudit({
    action: 'SESSION_REVOKED',
    entityType: 'Admin',
    entityId: adminId,
    adminId: ctx.adminId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { scope: 'single' },
  })
}

/** Revokes every other session belonging to the current administrator. */
export async function revokeOtherSessions(
  adminId: string,
  currentSid: string,
  ctx: RequestContext,
): Promise<number> {
  const rows = await loadActiveSessions()

  const sids = rows
    .filter(
      (row) => readSessionData(row.sess).adminId === adminId && row.sid !== currentSid,
    )
    .map((row) => row.sid)

  if (sids.length === 0) {
    return 0
  }

  const { count } = await prisma.session.deleteMany({ where: { sid: { in: sids } } })

  await recordAudit({
    action: 'SESSION_REVOKED_OTHERS',
    entityType: 'Admin',
    entityId: adminId,
    adminId: ctx.adminId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { revoked: count },
  })

  return count
}
