import { prisma } from '../db/prisma.js'

/**
 * Privacy-friendly traffic counts (docs/13 §10). Only aggregate daily counts per
 * public route are stored: no IP address, cookie, user agent, referrer, or
 * visitor id. Dynamic project pages collapse into one bucket so the table stays
 * bounded and individual projects cannot be ranked against each other.
 */

const ROUTES = ['/', '/about', '/experience', '/contact', '/projects'] as const

const PROJECT_DETAIL = /^\/projects\/[a-z0-9-]{1,160}$/

export const RETENTION_DAYS = 400

export function normalizeTrackedPath(raw: string): string | null {
  if ((ROUTES as readonly string[]).includes(raw)) {
    return raw
  }

  if (PROJECT_DETAIL.test(raw)) {
    return '/projects/:slug'
  }

  return null
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Returns whether the path was countable; unknown paths are ignored silently. */
export async function recordPageView(rawPath: string): Promise<boolean> {
  const path = normalizeTrackedPath(rawPath)

  if (!path) {
    return false
  }

  const day = startOfUtcDay(new Date())

  await prisma.pageViewDaily.upsert({
    where: { day_path: { day, path } },
    create: { day, path, count: 1 },
    update: { count: { increment: 1 } },
  })

  // Bounded retention without a separate background job.
  await prisma.pageViewDaily.deleteMany({
    where: { day: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } },
  })

  return true
}

export async function getAnalytics(days: number) {
  const start = startOfUtcDay(new Date(Date.now() - (days - 1) * 86_400_000))

  const rows = await prisma.pageViewDaily.findMany({
    where: { day: { gte: start } },
    orderBy: { day: 'asc' },
  })

  const daily = new Map<string, number>()

  for (let index = 0; index < days; index += 1) {
    daily.set(isoDay(new Date(start.getTime() + index * 86_400_000)), 0)
  }

  const perPath = new Map<string, number>()

  for (const row of rows) {
    const key = isoDay(row.day)
    daily.set(key, (daily.get(key) ?? 0) + row.count)
    perPath.set(row.path, (perPath.get(row.path) ?? 0) + row.count)
  }

  const topPaths = [...perPath.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)

  return {
    days,
    total: rows.reduce((sum, row) => sum + row.count, 0),
    daily: [...daily.entries()].map(([date, count]) => ({ date, count })),
    topPaths,
    retentionDays: RETENTION_DAYS,
  }
}
