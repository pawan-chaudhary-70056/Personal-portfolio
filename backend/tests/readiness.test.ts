import { chmod } from 'node:fs/promises'
import path from 'node:path'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'

const app = createApp()

// The isolated media root from vitest.config.ts.
const mediaRoot = path.resolve(process.cwd(), 'tests/.tmp-media')

// Root ignores directory permissions, so the degraded case cannot be provoked
// by chmod when the suite runs as root (for example inside a container).
const runningAsRoot = typeof process.getuid === 'function' && process.getuid() === 0

const failure = new Error('connect ECONNREFUSED 10.0.0.5:5432')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readiness probe', () => {
  it('reports ready when the database and media storage answer', async () => {
    const response = await request(app).get('/api/ready').expect(200)

    expect(response.body).toEqual({
      status: 'ok',
      checks: { database: true, storage: true },
    })
  })

  it('answers 503 without leaking internals when the database is unreachable', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(failure)

    const response = await request(app).get('/api/ready').expect(503)

    expect(response.body).toEqual({
      status: 'error',
      checks: { database: false, storage: true },
    })
    // The probe is public: no hosts, addresses, or error text.
    expect(JSON.stringify(response.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|Error/)
  })

  it.skipIf(runningAsRoot)(
    'stays available but reports degraded when media storage is not writable',
    async () => {
      await chmod(mediaRoot, 0o500)

      try {
        const response = await request(app).get('/api/ready').expect(200)

        expect(response.body).toEqual({
          status: 'degraded',
          checks: { database: true, storage: false },
        })
      } finally {
        await chmod(mediaRoot, 0o700)
      }
    },
  )

  it('keeps liveness independent of dependencies', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(failure)

    const response = await request(app).get('/api/health').expect(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
