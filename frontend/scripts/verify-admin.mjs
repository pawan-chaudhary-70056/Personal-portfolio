/**
 * Admin end-to-end verification.
 *
 * Requires the API (port 4000) and the Vite dev server (port 5173) to be running,
 * plus a provisioned admin account (npm run create-admin in backend/).
 *
 *   node scripts/verify-admin.mjs
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:5173'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'owner@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Dev-Only-Passphrase-2026!'

const results = []
const pass = (message) => results.push(`PASS  ${message}`)
const fail = (message) => results.push(`FAIL  ${message}`)
const check = (condition, message) => (condition ? pass(message) : fail(message))

const title = `E2E Project ${Date.now()}`
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const summary = 'A project created by the automated end-to-end verification script.'
const updatedSummary = 'The summary was edited by the end-to-end verification script.'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const consoleErrors = []
const pageErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(error.message))

/** Waits for async content to paint instead of asserting on a stale frame. */
async function waitVisible(locator, timeout = 10_000) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

async function audit(label) {
  await page.addScriptTag({ content: axeSource })
  const axeResults = await page.evaluate(async () =>
    window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    }),
  )

  const violations = axeResults.violations.map(
    (violation) => `${violation.id} (${violation.nodes.length}): ${violation.help}`,
  )
  check(violations.length === 0, `axe: no WCAG A/AA violations on ${label} (${violations.join(' | ')})`)

  if (violations.length > 0) {
    for (const violation of axeResults.violations) {
      for (const node of violation.nodes) {
        results.push(
          `      ${violation.id} ${node.target.join(' ')} :: ${node.failureSummary?.replace(/\n/g, ' ')}`,
        )
      }
    }
  }
}

// ------------------------------------------------- unauthenticated access
await page.goto(`${BASE_URL}/admin/projects`, { waitUntil: 'networkidle' })
check(page.url().endsWith('/admin/login'), 'signed-out visitor is redirected to the login page')
await audit('the login page')

// ------------------------------------------------------- invalid sign-in
await page.getByLabel('Email').fill(ADMIN_EMAIL)
await page.getByLabel('Password').fill('definitely-the-wrong-password')
await page.getByRole('button', { name: 'Sign in' }).click()

const loginError = page.getByRole('alert')
await loginError.waitFor({ timeout: 5000 })
check(
  (await loginError.innerText()).includes('Email or password is incorrect'),
  'invalid credentials show a generic error message',
)
check(page.url().endsWith('/admin/login'), 'failed sign-in keeps the visitor on the login page')

// ------------------------------------------------------------- sign-in
await page.getByLabel('Password').fill(ADMIN_PASSWORD)
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL('**/admin/projects', { timeout: 10_000 })
check(
  page.url().endsWith('/admin/projects'),
  'sign-in returns the visitor to the page they originally requested',
)
check(
  await waitVisible(page.getByRole('heading', { name: 'Projects', exact: true })),
  'the requested admin page renders after sign-in',
)

await page.getByRole('link', { name: 'Overview' }).first().click()
await page.waitForURL('**/admin')

check(
  await waitVisible(page.getByRole('heading', { name: 'Content at a glance' })),
  'the overview page renders',
)
check(
  await waitVisible(page.getByText(ADMIN_EMAIL)),
  'the signed-in admin identity is displayed',
)

const cookies = await context.cookies()
const sessionCookie = cookies.find((cookie) => cookie.name === 'portfolio.sid')
check(Boolean(sessionCookie), 'session cookie is set')
check(sessionCookie?.httpOnly === true, 'session cookie is HttpOnly')
check(sessionCookie?.sameSite === 'Lax', `session cookie is SameSite=Lax (${sessionCookie?.sameSite})`)

const clientCookies = await page.evaluate(() => document.cookie)
check(!clientCookies.includes('portfolio.sid'), 'session cookie is not readable from JavaScript')

const storageKeys = await page.evaluate(() => ({
  local: Object.keys(localStorage).length,
  session: Object.keys(sessionStorage).length,
}))
check(
  storageKeys.local === 0 && storageKeys.session === 0,
  `no session data is stored in web storage (${JSON.stringify(storageKeys)})`,
)

check(
  (await waitVisible(page.getByText('Recent activity'))) &&
    (await waitVisible(page.getByText('Signed in'))),
  'the audit log shows the sign-in event',
)
await audit('the admin overview')

// -------------------------------------------------------- create project
await page.getByRole('link', { name: 'Projects' }).first().click()
await page.waitForURL('**/admin/projects')
check(
  await waitVisible(page.getByRole('heading', { name: 'Projects', exact: true })),
  'projects page renders',
)

await page.getByRole('link', { name: 'New project' }).first().click()
await page.waitForURL('**/admin/projects/new')

// Submit an empty form to confirm server-side validation is surfaced.
await page.getByRole('button', { name: 'Create project' }).click()
const validationAlert = page.getByRole('alert')
await validationAlert.waitFor({ timeout: 5000 })
check(
  (await validationAlert.innerText()).includes('correct the highlighted fields'),
  'server validation errors are shown to the administrator',
)
check(
  (await page.getByText('Title needs at least 2 characters.').first().isVisible()),
  'field-level validation messages appear next to the field',
)

await page.getByLabel('Title').first().fill(title)
await page.getByLabel('Summary').fill(summary)
await page.getByLabel('Year').fill('2026')
await page.getByLabel('Category').fill('Verification')
await page.getByLabel('Technologies').fill('Playwright, Supertest')
await page.getByRole('button', { name: 'Create project' }).click()

await page.waitForURL(/\/admin\/projects\/[a-z0-9]+$/, { timeout: 10_000 })
check(
  await waitVisible(page.getByText('Project created.')),
  'creating a project shows a success message',
)
check(
  await waitVisible(page.getByRole('heading', { name: title })),
  'the new project opens in the edit view',
)
await audit('the edit page')

// -------------------------------------------------- draft is not public
const draftPublic = await page.request.get(`${BASE_URL}/api/projects`)
const draftBody = await draftPublic.json()
check(
  !draftBody.projects.some((project) => project.title === title),
  'a draft project is not exposed by the public API',
)

// -------------------------------------------------------- publish from list
await page.getByRole('link', { name: 'Back to projects' }).click()
await page.waitForURL('**/admin/projects')

const row = page.getByRole('row', { name: new RegExp(title) })
await row.waitFor({ timeout: 5000 })
check(
  (await row.innerText()).toLowerCase().includes('draft'),
  'the new project is listed as a draft',
)

await page.getByRole('button', { name: `Publish ${title}` }).click()
await page.getByText('is now published and publicly visible.').waitFor({ timeout: 10_000 })

const publishedRow = page.getByRole('row', { name: new RegExp(title) }).filter({
  hasText: /published/i,
})
check(
  await waitVisible(publishedRow),
  'publishing updates the status in the table',
)

const publishedPublic = await page.request.get(`${BASE_URL}/api/projects`)
const publishedBody = await publishedPublic.json()
const publishedProject = publishedBody.projects.find((project) => project.title === title)
check(Boolean(publishedProject), 'a published project appears in the public API')
check(
  publishedProject && !('status' in publishedProject) && !('archivedAt' in publishedProject),
  'the public API omits administrative fields',
)
await audit('the projects table')

// ------------------------------------------------------------ edit + save
await page.getByRole('link', { name: 'Edit' }).first().click()
await page.waitForURL(/\/admin\/projects\/[a-z0-9]+$/)
await page.getByLabel('Summary').fill(updatedSummary)
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Changes saved.').waitFor({ timeout: 10_000 })
check(await waitVisible(page.getByText('Changes saved.')), 'editing a project reports success')

const editedPublic = await page.request.get(`${BASE_URL}/api/projects`)
const editedBody = await editedPublic.json()
check(
  editedBody.projects.some((project) => project.summary === updatedSummary),
  'saved edits reach the public API',
)

// -------------------------------------------------- delete with confirmation
await page.getByRole('link', { name: 'Back to projects' }).click()
await page.waitForURL('**/admin/projects')

await page.getByRole('button', { name: `Delete ${title}` }).click()
const dialog = page.getByRole('dialog')
await dialog.waitFor({ timeout: 5000 })
check(await dialog.isVisible(), 'deleting opens a confirmation dialog')
check(
  (await dialog.innerText()).includes('cannot be undone'),
  'the confirmation dialog explains the consequence',
)

await dialog.getByRole('button', { name: 'Cancel' }).click()
check(
  (await dialog.isVisible()) === false &&
    (await page.getByRole('row', { name: new RegExp(title) }).count()) === 1,
  'cancelling keeps the project',
)

await page.getByRole('button', { name: `Delete ${title}` }).click()
await dialog.waitFor()
await dialog.getByRole('button', { name: 'Delete project' }).click()
await page.getByText('was permanently deleted.').waitFor({ timeout: 10_000 })
check(
  (await page.getByRole('row', { name: new RegExp(title) }).count()) === 0,
  'confirming removes the project from the table',
)

const deletedPublic = await page.request.get(`${BASE_URL}/api/projects`)
const deletedBody = await deletedPublic.json()
check(
  !deletedBody.projects.some((project) => project.slug === slug),
  'the deleted project is gone from the public API',
)

// ---------------------------------------------------------- create skill
const skillName = `E2E Skill ${Date.now()}`

await page.getByRole('link', { name: 'Skills' }).first().click()
await page.waitForURL('**/admin/skills')
check(
  await waitVisible(page.getByRole('heading', { name: 'Skills', exact: true })),
  'skills page renders',
)

await page.getByRole('link', { name: 'New skill' }).first().click()
await page.waitForURL('**/admin/skills/new')
await page.getByRole('button', { name: 'Create skill' }).click()
await page.getByRole('alert').waitFor({ timeout: 5000 })
check(
  await waitVisible(page.getByText('Enter the skill name.').first()),
  'skill validation errors are shown next to the field',
)

await page.getByLabel(/^Skill/).fill(skillName)
await page.getByLabel('Category').fill('Verification')
await page.getByLabel('Description').fill('Created by the end-to-end verification script.')
await audit('the skill form')
await page.getByRole('button', { name: 'Create skill' }).click()
await page.waitForURL('**/admin/skills', { timeout: 10_000 })
check(await waitVisible(page.getByText('Skill created.')), 'creating a skill reports success')

const skillRow = page.getByRole('row', { name: new RegExp(skillName) })
check(await waitVisible(skillRow), 'the new skill is listed')
check(
  (await skillRow.innerText()).toLowerCase().includes('published'),
  'new skills are published by default',
)

const publicSkills = await (await page.request.get(`${BASE_URL}/api/skills`)).json()
check(
  publicSkills.skills.some((skill) => skill.name === skillName),
  'a published skill appears in the public API',
)

// --------------------------------------------------------- hide + publish
await page.getByRole('button', { name: `Hide ${skillName}` }).click()
await page.getByText('is hidden from the public site.').waitFor({ timeout: 10_000 })

const hiddenSkills = await (await page.request.get(`${BASE_URL}/api/skills`)).json()
check(
  !hiddenSkills.skills.some((skill) => skill.name === skillName),
  'a hidden skill is omitted from the public API',
)
check(
  await waitVisible(page.getByRole('row', { name: new RegExp(skillName) }).filter({ hasText: /hidden/i })),
  'hiding a skill updates its visibility in the table',
)

await page.getByRole('button', { name: `Publish ${skillName}` }).click()
await page.getByText('is now published.').waitFor({ timeout: 10_000 })
await audit('the skills table')

// --------------------------------------------------------- edit + delete
await page.getByRole('link', { name: 'Edit' }).first().click()
await page.waitForURL(/\/admin\/skills\/[a-z0-9]+$/)
await page.getByLabel('Description').fill('Edited by the end-to-end verification script.')
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Changes saved.').waitFor({ timeout: 10_000 })
check(await waitVisible(page.getByText('Changes saved.')), 'editing a skill reports success')

await page.getByRole('link', { name: 'Back to skills' }).click()
await page.waitForURL('**/admin/skills')
await page.getByRole('button', { name: `Delete ${skillName}` }).click()
const skillDialog = page.getByRole('dialog')
await skillDialog.waitFor({ timeout: 5000 })
await skillDialog.getByRole('button', { name: 'Delete skill' }).click()
await page.getByText('was permanently deleted.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(skillName) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(skillName) }).count()) === 0,
  'deleting a skill removes it from the table',
)

// ----------------------------------------------------- create experience
const experienceRole = `E2E Role ${Date.now()}`

await page.getByRole('link', { name: 'Experience' }).first().click()
await page.waitForURL('**/admin/experience')
check(
  await waitVisible(page.getByRole('heading', { name: 'Experience', exact: true })),
  'experience page renders',
)

await page.getByRole('link', { name: 'New entry' }).first().click()
await page.waitForURL('**/admin/experience/new')
await page.getByRole('button', { name: 'Create entry' }).click()
await page.getByRole('alert').waitFor({ timeout: 5000 })
check(
  await waitVisible(page.getByText('Enter the role.').first()),
  'experience validation errors are shown next to the field',
)

await page.getByLabel(/^Role/).fill(experienceRole)
await page.getByLabel('Organization').fill('Verification Organisation')
await page.getByLabel('Start date').fill('2025-02-01')
check(
  await page.locator('#endDate').isDisabled(),
  'the end date is disabled while the role is marked current',
)
await audit('the experience form')
await page.getByRole('button', { name: 'Create entry' }).click()
await page.waitForURL('**/admin/experience', { timeout: 10_000 })
check(await waitVisible(page.getByText('Experience entry created.')), 'creating an entry reports success')

const experienceRow = page.getByRole('row', { name: new RegExp(experienceRole) })
await experienceRow.waitFor({ timeout: 5000 })
check(
  (await experienceRow.innerText()).includes('Present'),
  'a current role is displayed as ongoing',
)

const publicExperience = await (await page.request.get(`${BASE_URL}/api/experience`)).json()
const publicEntry = publicExperience.experience.find((entry) => entry.role === experienceRole)
check(Boolean(publicEntry), 'a published experience entry appears in the public API')
check(publicEntry?.endDate === null, 'a current role is exposed without an end date')

// -------------------------------------------------- add an end date
await page.getByRole('link', { name: 'Edit' }).first().click()
await page.waitForURL(/\/admin\/experience\/[a-z0-9]+$/)
await page.locator('#isCurrent').uncheck()
await page.locator('#endDate').fill('2025-06-30')
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Changes saved.').waitFor({ timeout: 10_000 })

const endedEntry = (await (await page.request.get(`${BASE_URL}/api/experience`)).json()).experience.find(
  (entry) => entry.role === experienceRole,
)
check(
  typeof endedEntry?.endDate === 'string' && endedEntry.endDate.startsWith('2025-06-30'),
  'saving an end date updates the public record',
)
await audit('the experience edit page')

await page.getByRole('link', { name: 'Back to experience' }).click()
await page.waitForURL('**/admin/experience')
await audit('the experience table')

await page.getByRole('button', { name: `Delete ${experienceRole}` }).click()
const experienceDialog = page.getByRole('dialog')
await experienceDialog.waitFor({ timeout: 5000 })
await experienceDialog.getByRole('button', { name: 'Delete entry' }).click()
await page.getByText('was permanently deleted.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(experienceRole) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(experienceRole) }).count()) === 0,
  'deleting an experience entry removes it from the table',
)

// ------------------------------------------------------------- sign out
await page.getByRole('button', { name: 'Sign out' }).first().click()
await page.waitForURL('**/admin/login', { timeout: 10_000 })
check(page.url().endsWith('/admin/login'), 'signing out returns to the login page')

await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
check(
  page.url().endsWith('/admin/login'),
  'the admin area is inaccessible after signing out',
)

// -------------------------------------------------------- mobile layout
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mobilePage = await mobile.newPage()
await mobilePage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' })
await mobilePage.getByLabel('Email').fill(ADMIN_EMAIL)
await mobilePage.getByLabel('Password').fill(ADMIN_PASSWORD)
await mobilePage.getByRole('button', { name: 'Sign in' }).click()
await mobilePage.waitForURL('**/admin', { timeout: 10_000 })

const overflow = await mobilePage.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)
check(overflow <= 0, `no horizontal overflow on mobile admin (${overflow}px)`)

await mobilePage.getByRole('button', { name: 'Menu' }).click()
check(
  await mobilePage.getByRole('link', { name: 'Projects' }).first().isVisible(),
  'mobile admin navigation opens',
)
await mobilePage.getByRole('link', { name: 'Projects' }).first().click()
await mobilePage.waitForURL('**/admin/projects')
const mobileHeadingVisible = await mobilePage
  .getByRole('heading', { name: 'Projects', exact: true })
  .first()
  .waitFor({ state: 'visible', timeout: 10_000 })
  .then(() => true)
  .catch(() => false)
check(mobileHeadingVisible, 'mobile navigation reaches the projects page')
await mobile.close()

// --------------------------------------------------------------- console
check(pageErrors.length === 0, `no uncaught page errors (${pageErrors.join(' | ') || 'none'})`)

// Deliberate negative tests (bad password, empty form, signed-out probes) produce
// 4xx resource errors in the console; only unexpected failures count.
const unexpectedConsole = consoleErrors.filter(
  (message) => !/status of (400|401|403)/.test(message),
)
check(
  unexpectedConsole.length === 0,
  `no unexpected console errors (${unexpectedConsole.join(' | ') || 'none'})`,
)

await browser.close()

const failures = results.filter((line) => line.startsWith('FAIL'))
console.log(results.join('\n'))
console.log(`\n${results.length - failures.length}/${results.length} checks passed`)

if (failures.length > 0) {
  process.exitCode = 1
}
