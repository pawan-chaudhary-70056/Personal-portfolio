import { execFileSync } from 'node:child_process'
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
}
