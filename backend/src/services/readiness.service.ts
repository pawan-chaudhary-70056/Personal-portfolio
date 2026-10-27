import { access, constants, mkdir } from 'node:fs/promises'
import { prisma } from '../db/prisma.js'
import { mediaRootPath } from './media-storage.js'

/** Deliberately the same vocabulary as the administrative health summary. */
export type ReadinessStatus = 'ok' | 'degraded' | 'error'

export interface ReadinessReport {
  status: ReadinessStatus
  checks: {
    database: boolean
    storage: boolean
  }
}

async function databaseAnswers(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/**
 * The media directory is created on first upload, so readiness creates it too
 * instead of reporting a fresh deployment as degraded.
 */
async function storageWritable(): Promise<boolean> {
  try {
    const root = mediaRootPath()
    await mkdir(root, { recursive: true, mode: 0o700 })
    await access(root, constants.W_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Public readiness probe for platform health checks and uptime monitors.
 *
 * The database is the only gating dependency: without it the API cannot serve a
 * single page, so a failure means the endpoint answers 503. Media storage is
 * reported but does not gate, because a full or read-only volume degrades
 * uploads without taking the public site down — that case answers 200 with a
 * `degraded` status, which is what an alert should watch for.
 *
 * The payload is two booleans. No hosts, paths, versions, timings, or error
 * text, so the endpoint stays safe to expose (docs/10-security.md §16.4).
 */
export async function getReadiness(): Promise<ReadinessReport> {
  const [database, storage] = await Promise.all([databaseAnswers(), storageWritable()])

  return {
    status: database ? (storage ? 'ok' : 'degraded') : 'error',
    checks: { database, storage },
  }
}
