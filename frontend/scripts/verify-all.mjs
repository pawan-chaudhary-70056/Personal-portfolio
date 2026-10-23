/**
 * Runs both end-to-end verifiers in sequence:
 *
 *   npm run verify
 *
 * Requirements (checked before anything starts):
 *   - API on port 4000        cd backend && npm run dev
 *   - Vite dev server on 5173  cd frontend && npm run dev
 *
 * The homepage verifier runs against the built app (`vite preview`, port 4173).
 * This script starts it when it is not already running and stops it again
 * afterwards, so the built bundle is what gets verified.
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000/api/health'
const ADMIN_URL = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:5173'
const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173'

async function reachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return response.ok
  } catch {
    return false
  }
}

function run(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(scriptsDir, script)], { stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

function startPreview() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  return spawn(npm, ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
    cwd: join(scriptsDir, '..'),
    stdio: 'ignore',
  })
}

const missing = []

if (!(await reachable(API_URL))) {
  missing.push(`API (${API_URL}) — start it with: cd backend && npm run dev`)
}

if (!(await reachable(ADMIN_URL))) {
  missing.push(`Vite dev server (${ADMIN_URL}) — start it with: cd frontend && npm run dev`)
}

if (missing.length > 0) {
  console.error('Cannot run verification. Missing services:\n')
  for (const entry of missing) console.error(`  - ${entry}`)
  console.error('\nA running PostgreSQL instance is also required (docker compose up -d db).')
  process.exit(1)
}

let preview = null

if (!(await reachable(PREVIEW_URL))) {
  preview = startPreview()

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await reachable(PREVIEW_URL)) break
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  if (!(await reachable(PREVIEW_URL))) {
    console.error(`Preview server did not start on ${PREVIEW_URL}.`)
    preview.kill()
    process.exit(1)
  }
}

const homepageExit = await run('verify-homepage.mjs')
const adminExit = await run('verify-admin.mjs')

if (preview) {
  preview.kill('SIGTERM')
}

console.log(
  `\nverify-homepage: ${homepageExit === 0 ? 'passed' : 'FAILED'}\n` +
    `verify-admin:    ${adminExit === 0 ? 'passed' : 'FAILED'}`,
)

process.exit(homepageExit === 0 && adminExit === 0 ? 0 : 1)
