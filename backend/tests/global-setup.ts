import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { TEST_DATABASE_URL } from './config.js'

/**
 * Applies committed migrations to the isolated test database.
 *
 * The session table is part of the Prisma schema, so migrations create it — the
 * test setup deliberately does not fabricate it, which keeps a fresh deployment
 * reproducible.
 */
export default function setup(): void {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  })

  // Uploaded test media must start empty so cleanup assertions are meaningful.
  const mediaRoot = path.resolve(process.cwd(), 'tests/.tmp-media')
  rmSync(mediaRoot, { recursive: true, force: true })
  mkdirSync(mediaRoot, { recursive: true })
}
