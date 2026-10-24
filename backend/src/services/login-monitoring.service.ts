import { prisma } from '../db/prisma.js'
import type { LoginMonitoringQuery } from '../schemas/audit.schema.js'

/**
 * Failed-login monitoring (docs/10 §5.6). Aggregates the authentication events
 * already written to the append-only audit trail: failed password attempts,
 * failed second-factor codes, and successful sign-ins over a rolling window,
 * plus a per-source breakdown of failures and the most recent failures with
 * the account that was targeted. Read-only; no secrets, passwords, or session
 * identifiers are returned.
 */

const RECENT_LIMIT = 20
const TOP_SOURCE_LIMIT = 10

const AUTH_ACTIONS = ['AUTH_LOGIN_FAILED', 'AUTH_MFA_FAILED', 'AUTH_LOGIN_SUCCEEDED'] as const

export interface LoginMonitoringTotals {
  failedLogins: number
  failedMfaCodes: number
  successfulLogins: number
}

export interface LoginMonitoringSource {
  ipAddress: string | null
  failures: number
  lastFailureAt: string
}

export interface LoginMonitoringFailure {
  id: string
  action: string
  /** Account the attempt targeted, when the attempt reached an account. */
  email: string | null
  /** Short machine reason for the failure, when one was recorded. */
  reason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface LoginMonitoringReport {
  windowDays: number
  totals: LoginMonitoringTotals
  /** Sources with the most failed sign-ins first. */
  bySource: LoginMonitoringSource[]
  /** Newest failures first, capped so the payload stays small. */
  recent: LoginMonitoringFailure[]
}

/** Pulls a string field out of audit metadata without trusting its shape. */
function readMetadataString(metadata: unknown, key: string): string | null {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value.slice(0, 254) : null
}

export async function getLoginMonitoring(query: LoginMonitoringQuery): Promise<LoginMonitoringReport> {
  const since = new Date(Date.now() - query.days * 86_400_000)

  const [countByAction, sourceRows, recentRows] = await Promise.all([
    prisma.auditEvent.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since }, action: { in: [...AUTH_ACTIONS] } },
      _count: { _all: true },
    }),
    // Failures grouped by source address; `ipAddress` is a real column, so the
    // database aggregates without reading individual rows into the app.
    prisma.auditEvent.groupBy({
      by: ['ipAddress'],
      where: { createdAt: { gte: since }, action: 'AUTH_LOGIN_FAILED' },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.auditEvent.findMany({
      where: { createdAt: { gte: since }, action: { in: ['AUTH_LOGIN_FAILED', 'AUTH_MFA_FAILED'] } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        id: true,
        action: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
  ])

  const totals: LoginMonitoringTotals = {
    failedLogins: 0,
    failedMfaCodes: 0,
    successfulLogins: 0,
  }

  for (const row of countByAction) {
    if (row.action === 'AUTH_LOGIN_FAILED') {
      totals.failedLogins = row._count._all
    } else if (row.action === 'AUTH_MFA_FAILED') {
      totals.failedMfaCodes = row._count._all
    } else if (row.action === 'AUTH_LOGIN_SUCCEEDED') {
      totals.successfulLogins = row._count._all
    }
  }

  const bySource = sourceRows
    .map((row) => ({
      ipAddress: row.ipAddress,
      failures: row._count._all,
      lastFailureAt: (row._max.createdAt ?? since).toISOString(),
    }))
    .sort(
      (left, right) =>
        right.failures - left.failures || right.lastFailureAt.localeCompare(left.lastFailureAt),
    )
    .slice(0, TOP_SOURCE_LIMIT)

  const recent = recentRows.map((row) => ({
    id: row.id,
    action: row.action,
    email: readMetadataString(row.metadata, 'email'),
    reason: readMetadataString(row.metadata, 'reason'),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  }))

  return { windowDays: query.days, totals, bySource, recent }
}
