import { access, constants } from 'node:fs/promises'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import { mediaRootPath } from './media-storage.js'

export type HealthStatus = 'ok' | 'degraded' | 'error'

export interface HealthCheck {
  id: string
  label: string
  status: HealthStatus
  detail: string
}

/**
 * Administrative health summary. Only safe indicators are exposed: no
 * connection strings, filesystem paths, credentials, or stack traces
 * (docs/13-admin-advanced-features.md §11).
 */
export async function getSystemHealth() {
  const checks: HealthCheck[] = []

  const startedAt = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.push({
      id: 'database',
      label: 'Database',
      status: 'ok',
      detail: `Responded in ${Date.now() - startedAt} ms.`,
    })
  } catch {
    checks.push({
      id: 'database',
      label: 'Database',
      status: 'error',
      detail: 'The database did not respond.',
    })
  }

  try {
    await prisma.session.count()
    checks.push({
      id: 'sessions',
      label: 'Session store',
      status: 'ok',
      detail: 'The session table is readable.',
    })
  } catch {
    checks.push({
      id: 'sessions',
      label: 'Session store',
      status: 'error',
      detail: 'The session table could not be read.',
    })
  }

  try {
    await access(mediaRootPath(), constants.W_OK)
    checks.push({
      id: 'media',
      label: 'Media storage',
      status: 'ok',
      detail: 'The media directory is writable.',
    })
  } catch {
    checks.push({
      id: 'media',
      label: 'Media storage',
      status: 'error',
      detail: 'Uploads cannot be written. Check the media volume and permissions.',
    })
  }

  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `
    const unfinished = rows[0]?.count ?? 0

    checks.push({
      id: 'migrations',
      label: 'Database migrations',
      status: unfinished === 0 ? 'ok' : 'error',
      detail:
        unfinished === 0
          ? 'No unfinished migrations.'
          : `${unfinished} migration(s) did not finish.`,
    })
  } catch {
    checks.push({
      id: 'migrations',
      label: 'Database migrations',
      status: 'degraded',
      detail: 'Migration status could not be read.',
    })
  }

  return {
    status: checks.some((check) => check.status === 'error')
      ? 'error'
      : checks.some((check) => check.status === 'degraded')
        ? 'degraded'
        : 'ok',
    checks,
    runtime: {
      environment: env.NODE_ENV,
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
    },
    checkedAt: new Date().toISOString(),
  }
}
