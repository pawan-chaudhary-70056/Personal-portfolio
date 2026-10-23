/**
 * Admin end-to-end verification.
 *
 * Requires the API (port 4000) and the Vite dev server (port 5173) to be running,
 * plus a provisioned admin account (npm run create-admin in backend/).
 *
 *   node scripts/verify-admin.mjs
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
const descriptionFirst = 'A detailed description paragraph written by the verification script.'
const descriptionSecond = 'A second paragraph confirms that blank lines become separate paragraphs.'
const liveUrl = 'https://example.com/e2e-live'
const repositoryUrl = 'https://example.com/e2e-repo'
const screenshotUrl = 'http://127.0.0.1:5173/e2e-screenshot.png'
const screenshotAlt = 'E2E screenshot of the project'
const screenshotCaption = 'E2E caption'
const contactName = `E2E Visitor ${Date.now()}`
const contactEmail = 'visitor@example.com'
// Starts with "=" so the CSV export's formula-injection guard is exercised.
const contactSubject = `=E2E Contact ${Date.now()}`
const contactMessage =
  'This message was submitted by the automated end-to-end verification script.\n\nIt checks that the inbox stores and displays the full text safely.'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const consoleErrors = []
const pageErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') {
    const url = message.location().url
    consoleErrors.push(
      url
        ? `${message.text()} (${url}) while on ${page.url()}`
        : `${message.text()} while on ${page.url()}`,
    )
  }
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

// Leftovers from an interrupted earlier run: clear them before anything else
// so the trash page starts from the same state every time.
const initialTrash = await page.request.get(`${BASE_URL}/api/admin/trash?pageSize=50`)
const initialTrashPayload = initialTrash.ok() ? await initialTrash.json() : null
const staleFixtures = (initialTrashPayload?.items ?? []).filter((item) =>
  item.title.startsWith('E2E'),
)
if (staleFixtures.length > 0) {
  const stalePurge = await page.request.post(`${BASE_URL}/api/admin/trash/purge`, {
    headers: { 'x-csrf-token': await currentCsrfToken() },
    data: { items: staleFixtures.map((item) => ({ type: item.type, id: item.id })) },
  })
  check(stalePurge.ok(), 'leftover fixtures from an interrupted run are purged')
}

// ------------------------------------------------- manage project categories
await page.getByRole('link', { name: 'Project categories' }).click()
await page.waitForURL('**/admin/project-categories')
check(
  await waitVisible(page.getByRole('heading', { name: 'Project categories' })),
  'project category management renders',
)

const verificationCategoryName = `Verification-${Date.now()}`
await page.getByLabel('Name').fill(verificationCategoryName)

const categoryResponsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/api/admin/project-categories') &&
    response.request().method() === 'POST',
  { timeout: 15_000 },
)

await page.getByRole('button', { name: 'Create category' }).click()

try {
  const response = await categoryResponsePromise
  console.log('Category POST status:', response.status())
  console.log('Category POST body:', await response.text())
} catch (error) {
  console.error('Category POST request was not captured:', error.message)
  console.error('Visible page errors:', await page.locator('body').innerText())
  throw error
}

console.log('Page after category submit:', await page.locator('body').innerText())

await page.getByText(
  `“${verificationCategoryName}” was created.`,
  { exact: true },
).waitFor({ timeout: 10_000 })
check(
  await waitVisible(page.getByRole('row', { name: /Verification/ })),
  'a new project category is listed',
)
await audit('the project categories page')

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
await page
  .getByLabel('Category')
  .selectOption({ label: verificationCategoryName })
await page.getByLabel('Technologies').fill('Playwright, Supertest')
await page
  .getByLabel('Description', { exact: true })
  .fill(`${descriptionFirst}\n\n${descriptionSecond}`)
await page.getByLabel('Live URL').fill(liveUrl)
await page.getByLabel('Repository URL').fill(repositoryUrl)

// A half-filled screenshot row must be rejected before any request is sent.
await page.getByRole('button', { name: 'Add screenshot' }).click()
await page.locator('#screenshot-0-url').fill(screenshotUrl)
await page.getByRole('button', { name: 'Create project' }).click()
check(
  await waitVisible(
    page.getByText('Each screenshot needs an image URL and alt text.'),
  ),
  'an incomplete screenshot row blocks submission with a message',
)
check(
  page.url().includes('/admin/projects/new'),
  'the form stays open when a screenshot row is incomplete',
)

await page.locator('#screenshot-0-alt').fill(screenshotAlt)
await page.locator('#screenshot-0-caption').fill(screenshotCaption)
await page.getByRole('button', { name: 'Create project' }).click()

await page.waitForURL(/\/admin\/projects\/[^/]+$/, { timeout: 10_000 })
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

// ------------------------------------------------ public project detail
await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
check(
  await waitVisible(page.locator(`img[alt="${screenshotAlt}"]`)),
  'the project card uses the first screenshot as its cover',
)

await page.goto(`${BASE_URL}/projects/${slug}`, { waitUntil: 'networkidle' })

const detailHeading = page.getByRole('heading', { level: 1 })
check(await waitVisible(detailHeading), 'the public project detail page renders')
check(
  (await detailHeading.innerText()).trim() === title,
  'the detail page shows the published title',
)

const detailText = await page.locator('main').innerText()
check(detailText.includes(descriptionFirst), 'the first description paragraph is rendered')
check(detailText.includes(descriptionSecond), 'the second description paragraph is rendered')
check(
  detailText.includes('Playwright') && detailText.includes('Supertest'),
  'the published technologies are listed',
)

check(
  await waitVisible(page.getByRole('heading', { name: 'Screenshots.' })),
  'the detail page renders the screenshot gallery',
)
check(
  await waitVisible(page.locator(`main img[alt="${screenshotAlt}"]`)),
  'the gallery image renders with its alt text',
)
check(
  (await page.getByText(screenshotCaption).count()) === 1,
  'the gallery caption is shown beneath the image',
)

const liveLink = page.getByRole('link', { name: /Visit the live site/ })
check(
  (await liveLink.getAttribute('href')) === liveUrl,
  'the live-site link points at the published URL',
)
check(
  (await liveLink.getAttribute('target')) === '_blank',
  'the live-site link opens in a new tab',
)

const repositoryLink = page.getByRole('link', { name: /View the repository/ })
check(
  (await repositoryLink.getAttribute('href')) === repositoryUrl,
  'the repository link points at the published URL',
)
check(
  (await repositoryLink.getAttribute('rel')) === 'noreferrer noopener',
  'external project links carry a safe rel attribute',
)

await audit('the public project detail page')

await page.goto(`${BASE_URL}/admin/projects`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor({ timeout: 10_000 })

// ------------------------------------------------------------ edit + save
await row.getByRole('link', { name: 'Edit' }).click()
await page.waitForURL(/\/admin\/projects\/[^/]+$/)
await page.getByLabel('Summary').fill(updatedSummary)
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Changes saved.').waitFor({ timeout: 10_000 })
check(await waitVisible(page.getByText('Changes saved.')), 'editing a project reports success')
check(
  (await page.locator('#screenshot-0-url').inputValue()) === screenshotUrl,
  'the edit form still shows the saved screenshot',
)

const editedPublic = await page.request.get(`${BASE_URL}/api/projects`)
const editedBody = await editedPublic.json()
check(
  editedBody.projects.some((project) => project.summary === updatedSummary),
  'saved edits reach the public API',
)
const editedProject = editedBody.projects.find((project) => project.slug === slug)
check(
  editedProject?.screenshots?.length === 1 &&
    editedProject.screenshots[0].alt === screenshotAlt,
  'the gallery survives an unrelated edit',
)

// -------------------------------------------------- delete with confirmation
await page.getByRole('link', { name: 'Back to projects' }).click()
await page.waitForURL('**/admin/projects')

await page.getByRole('button', { name: `Delete ${title}` }).click()
const dialog = page.getByRole('dialog')
await dialog.waitFor({ timeout: 5000 })
check(await dialog.isVisible(), 'deleting opens a confirmation dialog')
check(
  (await dialog.innerText()).includes('restore it from Trash'),
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
await dialog.getByRole('button', { name: 'Move to trash' }).click()
await page.getByText('was moved to the trash.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(title) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
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

// -------------------------------------------------------- trash and revisions
await page.getByRole('link', { name: 'Trash', exact: true }).click()
await page.waitForURL('**/admin/trash')
check(
  await waitVisible(page.getByRole('heading', { name: 'Trash', exact: true })),
  'trash page renders',
)
await audit('the trash page')

check(
  await waitVisible(page.getByRole('row', { name: new RegExp(title) })),
  'the deleted project appears in the trash',
)

await page
  .getByRole('row', { name: new RegExp(title) })
  .getByRole('button', { name: 'Restore' })
  .click()
check(await waitVisible(page.getByText(/was restored\./)), 'restoring a project reports success')
await page
  .getByRole('row', { name: new RegExp(title) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => undefined)
check(
  (await page.getByRole('row', { name: new RegExp(title) }).count()) === 0,
  'the restored project leaves the trash',
)

await page.getByRole('link', { name: 'Projects', exact: true }).click()
await page.waitForURL('**/admin/projects')
check(
  await waitVisible(page.getByRole('row', { name: new RegExp(title) })),
  'the restored project returns to the project list',
)

// Selection UI only: bulk publishing is covered by the backend suite so this
// script never changes seeded portfolio content.
await page.getByRole('checkbox', { name: 'Select all projects on this page' }).check()
check(
  await waitVisible(page.getByRole('region', { name: 'Bulk actions' })),
  'selecting rows reveals the bulk action toolbar',
)
await page.getByRole('button', { name: 'Clear selection' }).click()
check(
  (await page.getByRole('region', { name: 'Bulk actions' }).count()) === 0,
  'clearing the selection hides the bulk toolbar',
)

await page.getByRole('button', { name: `Delete ${title}` }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Move to trash' }).click()
await page.getByText('was moved to the trash.').waitFor({ timeout: 10_000 })

await page.getByRole('link', { name: 'Trash', exact: true }).click()
await page.waitForURL('**/admin/trash')
await page
  .getByRole('row', { name: new RegExp(title) })
  .getByRole('button', { name: 'Delete permanently' })
  .click()
const purgeDialog = page.getByRole('dialog')
await purgeDialog.waitFor({ timeout: 5000 })
await purgeDialog.getByRole('button', { name: 'Delete permanently' }).click()
check(
  await waitVisible(page.getByText(/was permanently deleted\./)),
  'purging a trashed project reports success',
)

// ------------------------------------------------ bulk trash operations
const bulkProjectTitles = [`E2E Bulk One ${Date.now()}`, `E2E Bulk Two ${Date.now()}`]
const bulkProjectIds = []

// The SPA fetches a fresh CSRF token on its first write after a reload, so the
// cookie is read at call time rather than captured once.
async function currentCsrfToken() {
  return (await context.cookies()).find((cookie) => cookie.name === 'csrf_token')?.value ?? ''
}

async function trashProjectThroughApi(id) {
  return page.request.delete(`${BASE_URL}/api/admin/projects/${id}`, {
    headers: { 'x-csrf-token': await currentCsrfToken() },
  })
}

for (const bulkTitle of bulkProjectTitles) {
  const created = await page.request.post(`${BASE_URL}/api/admin/projects`, {
    headers: { 'x-csrf-token': await currentCsrfToken() },
    data: {
      title: bulkTitle,
      summary: 'A project created for the bulk trash verification.',
      year: '2026',
    },
  })
  check(created.status() === 201, 'a bulk trash fixture project was created')
  const id = (await created.json()).project.id
  bulkProjectIds.push(id)
  check((await trashProjectThroughApi(id)).status() === 204, 'a bulk trash fixture was trashed')
}

// The page is already on the trash route, so reload rather than clicking a
// same-route link, which would leave the stale list in place.
await page.reload()
await page.getByRole('heading', { name: 'Trash', exact: true }).waitFor({ timeout: 10_000 })

for (const bulkTitle of bulkProjectTitles) {
  await page.getByRole('checkbox', { name: `Select ${bulkTitle}` }).check()
}
check(
  await waitVisible(page.getByText('2 items selected')),
  'selecting trash rows reveals the bulk toolbar',
)

await page.getByRole('button', { name: 'Restore selected' }).click()
check(
  await waitVisible(page.getByText('2 records were restored.')),
  'bulk restore reports success',
)

for (const bulkTitle of bulkProjectTitles) {
  await page
    .getByRole('row', { name: new RegExp(bulkTitle) })
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => undefined)
}
check(
  (await page.getByRole('row', { name: new RegExp(bulkProjectTitles[0]) }).count()) === 0 &&
    (await page.getByRole('row', { name: new RegExp(bulkProjectTitles[1]) }).count()) === 0,
  'bulk-restored records leave the trash',
)

for (const id of bulkProjectIds) {
  check(
    (await page.request.get(`${BASE_URL}/api/admin/projects/${id}`)).ok(),
    'a bulk-restored project is available again',
  )
  const reTrashed = await trashProjectThroughApi(id)
  check(reTrashed.status() === 204, 'a restored bulk fixture was trashed again')
}

await page.reload()
await page.getByRole('heading', { name: 'Trash', exact: true }).waitFor({ timeout: 10_000 })

for (const bulkTitle of bulkProjectTitles) {
  await page.getByRole('checkbox', { name: `Select ${bulkTitle}` }).check()
}

await page
  .getByRole('region', { name: 'Bulk actions' })
  .getByRole('button', { name: 'Delete permanently' })
  .click()
const bulkPurgeDialog = page.getByRole('dialog')
await bulkPurgeDialog.waitFor({ timeout: 5000 })
check(
  (await bulkPurgeDialog.innerText()).includes('2 items permanently'),
  'the bulk delete dialog names the selected count',
)
await bulkPurgeDialog.getByRole('button', { name: 'Delete 2 items' }).click()
check(
  await waitVisible(page.getByText('2 records were permanently deleted.')),
  'bulk permanent deletion reports success',
)

for (const bulkTitle of bulkProjectTitles) {
  await page
    .getByRole('row', { name: new RegExp(bulkTitle) })
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => undefined)
}
check(
  (await page.getByRole('row', { name: new RegExp(bulkProjectTitles[0]) }).count()) === 0,
  'bulk-deleted records leave the trash',
)

const remainingTrash = await (
  await page.request.get(`${BASE_URL}/api/admin/trash?pageSize=50`)
).json()
check(
  !remainingTrash.items.some((item) => bulkProjectIds.includes(item.id)),
  'bulk-deleted projects are gone',
)

await page.getByRole('link', { name: 'Revisions', exact: true }).click()
await page.waitForURL('**/admin/revisions')
check(
  await waitVisible(page.getByRole('heading', { name: 'Revision history', exact: true })),
  'revision history renders',
)
await audit('the revision history page')
check(
  (await page.getByRole('row').count()) > 1,
  'revision history lists saved snapshots',
)
check(
  await waitVisible(page.getByRole('button', { name: 'View snapshot' }).first()),
  'a revision snapshot can be opened',
)
await page.getByRole('button', { name: 'View snapshot' }).first().click()
check(
  await waitVisible(page.getByText('Changes in this revision')),
  'opening a snapshot shows a field-level diff',
)
check(
  await waitVisible(page.getByText('Raw snapshot')),
  'the raw snapshot stays available behind the diff',
)

// --------------------------------------------- delete unused project category
await page.getByRole('link', { name: 'Project categories' }).click()
await page.waitForURL('**/admin/project-categories')
await page.getByRole('button', { name: `Delete ${verificationCategoryName}`, exact: true }).click()
const projectCategoryDialog = page.getByRole('dialog')
await projectCategoryDialog.waitFor({ timeout: 5000 })
await projectCategoryDialog.getByRole('button', { name: 'Delete category' }).click()
await page.getByText('was deleted.').first().waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(verificationCategoryName) })
  .waitFor({ state: 'detached', timeout: 10_000 })
check(
  (await page.getByRole('row', { name: new RegExp(verificationCategoryName) }).count()) === 0,
  'an unused project category can be deleted',
)

// ---------------------------------------------------------- create skill
const skillName = `E2E Skill ${Date.now()}`
const skillCategoryName = `Skill Group ${Date.now()}`
const renamedSkillCategory = `${skillCategoryName} renamed`

// ------------------------------------------------ manage skill categories
await page.getByRole('link', { name: 'Skill categories' }).click()
await page.waitForURL('**/admin/skill-categories')
check(
  await waitVisible(page.getByRole('heading', { name: 'Skill categories' })),
  'skill category management renders',
)

await page.getByLabel('Name').fill(skillCategoryName)
await page.getByRole('button', { name: 'Create category' }).click()
await page.getByText('was created.').first().waitFor({ timeout: 10_000 })
check(
  await waitVisible(page.getByRole('row', { name: new RegExp(skillCategoryName) })),
  'a new skill category is listed',
)

await page.getByRole('button', { name: `Edit ${skillCategoryName}` }).click()
await page.getByLabel('Name').fill(renamedSkillCategory)
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('was updated.').first().waitFor({ timeout: 10_000 })
check(
  await waitVisible(page.getByRole('row', { name: new RegExp(renamedSkillCategory) })),
  'renaming a category updates the list',
)
await audit('the skill categories page')

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
await page.getByRole('option', { name: renamedSkillCategory }).waitFor({ state: 'attached' })
await page.getByLabel('Category').selectOption(renamedSkillCategory)
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
await skillRow.getByRole('link', { name: 'Edit' }).click()
await page.waitForURL(/\/admin\/skills\/[^/]+$/)
await page.getByLabel('Description').fill('Edited by the end-to-end verification script.')
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Changes saved.').waitFor({ timeout: 10_000 })
check(await waitVisible(page.getByText('Changes saved.')), 'editing a skill reports success')

await page.getByRole('link', { name: 'Back to skills' }).click()
await page.waitForURL('**/admin/skills')
await page.getByRole('button', { name: `Delete ${skillName}` }).click()
const skillDialog = page.getByRole('dialog')
await skillDialog.waitFor({ timeout: 5000 })
await skillDialog.getByRole('button', { name: 'Move to trash' }).click()
await page.getByText('was moved to the trash.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(skillName) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(skillName) }).count()) === 0,
  'deleting a skill removes it from the table',
)

// The category still references a trashed skill, so purge it before deleting
// the category; this also covers permanent deletion from the trash page.
await page.getByRole('link', { name: 'Trash', exact: true }).click()
await page.waitForURL('**/admin/trash')
await page
  .getByRole('row', { name: new RegExp(skillName) })
  .getByRole('button', { name: 'Delete permanently' })
  .click()
const skillPurgeDialog = page.getByRole('dialog')
await skillPurgeDialog.waitFor({ timeout: 5000 })
await skillPurgeDialog.getByRole('button', { name: 'Delete permanently' }).click()
await page.getByText(/was permanently deleted\./).waitFor({ timeout: 10_000 })

// ----------------------------------------------- delete unused skill category
await page.getByRole('link', { name: 'Skill categories' }).click()
await page.waitForURL('**/admin/skill-categories')
await page.getByRole('button', { name: `Delete ${renamedSkillCategory}` }).click()
const skillCategoryDialog = page.getByRole('dialog')
await skillCategoryDialog.waitFor({ timeout: 5000 })
await skillCategoryDialog.getByRole('button', { name: 'Delete category' }).click()
await page.getByText('was deleted.').first().waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(renamedSkillCategory) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(renamedSkillCategory) }).count()) === 0,
  'an unused skill category can be deleted',
)

// ------------------------------------------------------- homepage portrait
const heroPngPath = join(tmpdir(), `portfolio-hero-${Date.now()}.png`)
writeFileSync(
  heroPngPath,
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

await page.getByRole('link', { name: 'Homepage', exact: true }).click()
await page.waitForURL('**/admin/homepage')
check(
  await waitVisible(page.getByRole('heading', { name: 'Homepage', exact: true })),
  'homepage management renders',
)
await audit('the homepage management page')

// Snapshot the homepage first: the run must leave a developer's homepage
// exactly as it found it. A fresh database (CI) has no portrait and takes the
// full publish → remove path; an existing portrait takes the restore path.
const homepageBefore = (
  await (await page.request.get(`${BASE_URL}/api/admin/homepage`)).json()
).homepage
const originalDraft = homepageBefore.draft
const originalPublished = homepageBefore.published
const hadPortrait = Boolean(originalDraft.portrait || originalPublished?.portrait)

const homepageFields = (state) => ({
  portraitVisible: state.portraitVisible,
  effectEnabled: state.effectEnabled,
  tiltIntensity: state.tiltIntensity,
  animationIntensity: state.animationIntensity,
  floatingEnabled: state.floatingEnabled,
  sectionOrder: state.sectionOrder,
  hiddenSections: state.hiddenSections,
  featuredProjectIds: state.featuredProjectIds,
})

const patchHomepageDraft = async (fields) =>
  page.request.patch(`${BASE_URL}/api/admin/homepage`, {
    headers: { 'x-csrf-token': await currentCsrfToken() },
    data: fields,
  })

await page.setInputFiles('#hero-portrait-file', heroPngPath)
check(
  await waitVisible(page.getByText('Local preview of')),
  'a selected portrait is previewed before upload',
)

await page.getByRole('button', { name: 'Upload portrait' }).click()
await page.getByText('Portrait uploaded as a draft.').waitFor({ timeout: 15_000 })
check(
  await waitVisible(page.getByText(/Draft portrait:/)),
  'the uploaded portrait is stored as a draft',
)

const heroBeforePublish = await (await page.request.get(`${BASE_URL}/api/hero`)).json()
check(
  (heroBeforePublish.hero.portrait?.id ?? null) ===
    (originalPublished?.portrait?.id ?? null),
  'the draft portrait is not public before publishing',
)

const heroAlt = 'Verification portrait of the portfolio owner'
await page.getByLabel('Portrait description').fill(heroAlt)
await page.getByRole('button', { name: 'Save draft' }).click()
await page.getByText('Draft saved.').waitFor({ timeout: 10_000 })
check(await waitVisible(page.getByText('Draft saved.')), 'saving the portrait draft reports success')

let removedPortraitPreviewPath = null

if (hadPortrait) {
  // Restore path: put the original draft back instead of publishing, so a
  // real homepage portrait is never replaced or removed by verification.
  if (originalDraft.portrait) {
    const originalBytes = await page.request.get(`${BASE_URL}${originalDraft.portrait.url}`)
    const extension =
      originalDraft.portrait.mimeType === 'image/webp'
        ? 'webp'
        : originalDraft.portrait.mimeType === 'image/jpeg'
          ? 'jpg'
          : 'png'
    const restored = await page.request.post(`${BASE_URL}/api/admin/homepage/portrait`, {
      headers: { 'x-csrf-token': await currentCsrfToken() },
      multipart: {
        file: {
          name: `portrait.${extension}`,
          mimeType: originalDraft.portrait.mimeType,
          buffer: await originalBytes.body(),
        },
      },
    })
    check(restored.ok(), 'the previous draft portrait is re-uploaded')
    const restoredAlt = await patchHomepageDraft({
      portraitAlt: originalDraft.portrait.alt || null,
    })
    check(restoredAlt.ok(), 'the previous portrait description is restored')
  } else {
    const cleared = await page.request.delete(`${BASE_URL}/api/admin/homepage/portrait`, {
      headers: { 'x-csrf-token': await currentCsrfToken() },
    })
    check(cleared.ok(), 'the test draft portrait is cleared after verification')
  }

  const heroAfterRestore = await (await page.request.get(`${BASE_URL}/api/hero`)).json()
  check(
    (heroAfterRestore.hero.portrait?.id ?? null) ===
      (originalPublished?.portrait?.id ?? null),
    'verification leaves the public portrait unchanged',
  )
  await audit('the restored homepage portrait')
} else {
  await page.getByRole('button', { name: 'Publish changes' }).click()
  await page.getByText('Changes published.').waitFor({ timeout: 10_000 })

  const heroAfterPublish = await (await page.request.get(`${BASE_URL}/api/hero`)).json()
  check(
    heroAfterPublish.hero.portrait?.alt === heroAlt,
    'the published portrait and alt text reach the public API',
  )
  // This portrait is deliberately deleted later in the run, so a late preview
  // request for its admin file can legitimately return 404 once the file is gone.
  removedPortraitPreviewPath = heroAfterPublish.hero.portrait?.id
    ? `/api/admin/media/${heroAfterPublish.hero.portrait.id}/file`
    : null

  const heroImageResponse = await page.request.get(
    `${BASE_URL}${heroAfterPublish.hero.portrait.url}`,
  )
  check(
    heroImageResponse.status() === 200 &&
      heroImageResponse.headers()['content-type'] === 'image/png',
    'the published portrait bytes are served',
  )
  await audit('the published hero preview')

  await page.getByRole('button', { name: 'Remove draft portrait' }).click()
  const heroDialog = page.getByRole('dialog')
  await heroDialog.waitFor({ timeout: 5000 })
  await heroDialog.getByRole('button', { name: 'Remove portrait' }).click()
  await page.getByText('Draft portrait removed.').waitFor({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Publish changes' }).click()
  await page.getByText('Changes published.').waitFor({ timeout: 10_000 })

  const heroAfterRemoval = await (await page.request.get(`${BASE_URL}/api/hero`)).json()
  check(
    heroAfterRemoval.hero.portrait === null,
    'removing the portrait and publishing restores the fallback',
  )

  // Publishing the test draft overwrote the published hero state, so restore
  // published first and the draft second.
  if (originalPublished) {
    const restorePublished = await patchHomepageDraft(homepageFields(originalPublished))
    check(restorePublished.ok(), 'the previous published homepage settings are restored')
    const republish = await page.request.post(`${BASE_URL}/api/admin/homepage/publish`, {
      headers: { 'x-csrf-token': await currentCsrfToken() },
      data: {},
    })
    check(republish.ok(), 'the previous published homepage is republished')
  }

  const restoreDraft = await patchHomepageDraft(homepageFields(originalDraft))
  check(restoreDraft.ok(), 'the previous homepage draft settings are restored')
}

rmSync(heroPngPath, { force: true })

// ------------------------------------------------- homepage section layout
check(
  await waitVisible(page.getByRole('heading', { name: 'Homepage sections' })),
  'homepage section controls render',
)
check(
  (await page.getByRole('button', { name: /^Move .+ up$/ }).count()) === 6,
  'all six documented sections are listed',
)
check(
  (await page.getByRole('checkbox', { name: 'Show', exact: true }).count()) === 6,
  'each section has a visibility control',
)

const layoutResponse = page.waitForResponse(
  (response) =>
    response.url().endsWith('/api/admin/homepage') &&
    response.request().method() === 'PATCH',
)
await page.getByRole('button', { name: 'Save homepage layout' }).click()
check((await layoutResponse).ok(), 'the homepage layout saves through the API')
check(
  await waitVisible(page.getByText('Homepage layout saved as a draft.')),
  'saving the homepage layout reports success',
)

const layoutRestored = await patchHomepageDraft(homepageFields(originalDraft))
check(layoutRestored.ok(), 'the previous homepage layout draft is restored')

// ------------------------------------------------------------ site settings
await page.getByRole('link', { name: 'Site settings' }).click()
await page.waitForURL('**/admin/settings')
check(
  await waitVisible(page.getByRole('heading', { name: 'Site settings', exact: true })),
  'site settings page renders',
)
for (const label of ['Site title', 'Default description', 'Canonical URL', 'Social sharing image']) {
  check(await waitVisible(page.getByLabel(label)), `the settings form includes ${label}`)
}
await audit('the site settings page')

const previousTitle = (
  await (await page.request.get(`${BASE_URL}/api/admin/settings`)).json()
).settings.siteTitle

const saveSettings = async (title) => {
  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith('/api/admin/settings') &&
      candidate.request().method() === 'PATCH',
  )
  await page.getByLabel('Site title').fill(title)
  await page.getByRole('button', { name: 'Save settings' }).click()
  return response
}

check((await saveSettings('E2E Site Title')).ok(), 'site settings save through the API')
check(
  await waitVisible(page.getByText('Site settings saved.')),
  'saving site settings reports success',
)

const publicSite = await (await page.request.get(`${BASE_URL}/api/portfolio/homepage`)).json()
check(
  publicSite.homepage.site.siteTitle === 'E2E Site Title',
  'saved site settings reach the public homepage API',
)

check((await saveSettings(previousTitle)).ok(), 'the original site title is restored')
const restoredSite = await (await page.request.get(`${BASE_URL}/api/portfolio/homepage`)).json()
check(
  restoredSite.homepage.site.siteTitle === previousTitle,
  'the site title is restored after verification',
)

// ------------------------------------------------------------ media library
const mediaFilename = `media-${Date.now()}.png`
const mediaPngPath = join(tmpdir(), mediaFilename)
writeFileSync(
  mediaPngPath,
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)

await page.getByRole('link', { name: 'Media', exact: true }).click()
await page.waitForURL('**/admin/media')
check(
  await waitVisible(page.getByRole('heading', { name: 'Media library', exact: true })),
  'media library page renders',
)
await audit('the media library page')

await page.setInputFiles('#media-file', mediaPngPath)
await page.getByRole('button', { name: 'Upload image' }).click()
check(
  await waitVisible(page.getByText(/uploaded\. Add a description/)),
  'uploading an image reports success',
)

const mediaCard = page.locator('li', { hasText: mediaFilename })
check(await waitVisible(mediaCard), 'the uploaded image appears in the library')

await mediaCard.getByLabel('Description').fill('E2E media description')
await mediaCard.getByRole('button', { name: 'Save description' }).click()
check(
  await waitVisible(page.getByText('Image description saved.')),
  'editing the image description reports success',
)

const mediaList = await (
  await page.request.get(`${BASE_URL}/api/admin/media?search=${mediaFilename}`)
).json()
const uploadedMedia = mediaList.items.find(
  (item) => item.originalFilename === mediaFilename,
)
check(
  uploadedMedia?.altText === 'E2E media description',
  'the saved description reaches the media API',
)

await mediaCard.getByRole('button', { name: 'Delete' }).click()
const mediaDialog = page.getByRole('dialog')
await mediaDialog.waitFor({ timeout: 5000 })
await mediaDialog.getByRole('button', { name: 'Delete image' }).click()
check(
  await waitVisible(page.getByText(/deleted\.$/)),
  'deleting an unused image reports success',
)
await mediaCard.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined)
check((await mediaCard.count()) === 0, 'the deleted image leaves the library')

rmSync(mediaPngPath, { force: true })

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
await experienceRow.getByRole('link', { name: 'Edit' }).click()
await page.waitForURL(/\/admin\/experience\/[^/]+$/)
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
await experienceDialog.getByRole('button', { name: 'Move to trash' }).click()
await page.getByText('was moved to the trash.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(experienceRole) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(experienceRole) }).count()) === 0,
  'deleting an experience entry removes it from the table',
)

// -------------------------------------------------------------- education
const qualification = `E2E Qualification ${Date.now()}`

await page.getByRole('link', { name: 'Education', exact: true }).first().click()
await page.waitForURL('**/admin/education')
check(
  await waitVisible(page.getByRole('heading', { name: 'Education', exact: true })),
  'education page renders',
)

await page.getByRole('link', { name: 'New qualification' }).first().click()
await page.waitForURL('**/admin/education/new')
await page.getByRole('button', { name: 'Create qualification' }).click()
await page.getByRole('alert').waitFor({ timeout: 5000 })
check(
  await waitVisible(page.getByText('Enter the institution.').first()),
  'education validation errors are shown next to the field',
)

await page.locator('#qualification').fill(qualification)
await page.getByLabel('Institution').fill('Verification University')
await page.getByLabel('Field of study').fill('Applied Verification')
await page.getByLabel('Start date').fill('2020-09-01')
await page.getByLabel('End date').fill('2024-06-30')
await page.getByLabel('Description').fill('Created by the end-to-end verification script.')
await audit('the education form')
await page.getByRole('button', { name: 'Create qualification' }).click()
await page.waitForURL('**/admin/education', { timeout: 10_000 })
check(
  await waitVisible(page.getByText('Education entry created.')),
  'creating an education entry reports success',
)

const educationRow = page.getByRole('row', { name: new RegExp(qualification) })
check(await waitVisible(educationRow), 'the new education entry is listed')

const publicEducation = await (await page.request.get(`${BASE_URL}/api/education`)).json()
check(
  publicEducation.education.some((entry) => entry.qualification === qualification),
  'a published education entry appears in the public API',
)

await page.getByRole('button', { name: `Hide ${qualification}` }).click()
await page.getByText('is hidden from the public site.').waitFor({ timeout: 10_000 })
const hiddenEducation = await (await page.request.get(`${BASE_URL}/api/education`)).json()
check(
  !hiddenEducation.education.some((entry) => entry.qualification === qualification),
  'a hidden education entry is omitted from the public API',
)

await educationRow.getByRole('link', { name: 'Edit' }).click()
await page.waitForURL(/\/admin\/education\/[^/]+$/)
await page.getByLabel('Field of study').fill('Applied Verification and Testing')
await page.getByRole('button', { name: 'Save changes' }).click()
await page.getByText('Changes saved.').waitFor({ timeout: 10_000 })
check(await waitVisible(page.getByText('Changes saved.')), 'editing education reports success')
await audit('the education edit page')

await page.getByRole('link', { name: 'Back to education' }).click()
await page.waitForURL('**/admin/education')
await page.getByRole('button', { name: `Delete ${qualification}` }).click()
const educationDialog = page.getByRole('dialog')
await educationDialog.waitFor({ timeout: 5000 })
await educationDialog.getByRole('button', { name: 'Move to trash' }).click()
await page.getByText('was moved to the trash.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(qualification) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(qualification) }).count()) === 0,
  'deleting an education entry removes it from the table',
)
await audit('the education table')

// --------------------------------------------------------- certifications
const certificationName = `E2E Certification ${Date.now()}`

await page.getByRole('link', { name: 'Certifications', exact: true }).first().click()
await page.waitForURL('**/admin/certifications')
check(
  await waitVisible(page.getByRole('heading', { name: 'Certifications', exact: true })),
  'certifications page renders',
)

await page.getByRole('link', { name: 'New certification' }).first().click()
await page.waitForURL('**/admin/certifications/new')
await page.getByRole('button', { name: 'Create certification' }).click()
await page.getByRole('alert').waitFor({ timeout: 5000 })
check(
  await waitVisible(page.getByText('Enter the issuing organization.').first()),
  'certification validation errors are shown next to the field',
)

await page.locator('#name').fill(certificationName)
await page.getByLabel('Issuing organization').fill('Verification Institute')
await page.getByLabel('Issue date').fill('2025-01-15')
await page.getByLabel('Expiry date').fill('2024-01-15')
await page.getByLabel('Credential ID').fill('E2E-12345')
await page.getByLabel('Verification URL').fill('https://example.com/verify/e2e')
await page.getByRole('button', { name: 'Create certification' }).click()
check(
  await waitVisible(page.getByText('The expiry date must be on or after the issue date.')),
  'certification date ordering is enforced',
)

await page.getByLabel('Expiry date').fill('2028-01-15')
await audit('the certification form')
await page.getByRole('button', { name: 'Create certification' }).click()
await page.waitForURL('**/admin/certifications', { timeout: 10_000 })
check(
  await waitVisible(page.getByText('Certification created.')),
  'creating a certification reports success',
)

const certificationRow = page.getByRole('row', { name: new RegExp(certificationName) })
check(await waitVisible(certificationRow), 'the new certification is listed')

const publicCertifications = await (
  await page.request.get(`${BASE_URL}/api/certifications`)
).json()
const publicCertification = publicCertifications.certifications.find(
  (entry) => entry.name === certificationName,
)
check(Boolean(publicCertification), 'a published certification appears in the public API')
check(
  publicCertification?.credentialUrl === 'https://example.com/verify/e2e',
  'the public certification includes its verification URL',
)

await page.getByRole('button', { name: `Hide ${certificationName}` }).click()
await page.getByText('is hidden from the public site.').waitFor({ timeout: 10_000 })
const hiddenCertifications = await (
  await page.request.get(`${BASE_URL}/api/certifications`)
).json()
check(
  !hiddenCertifications.certifications.some(
    (entry) => entry.name === certificationName,
  ),
  'a hidden certification is omitted from the public API',
)
await audit('the certifications table')

await page.getByRole('button', { name: `Delete ${certificationName}` }).click()
const certificationDialog = page.getByRole('dialog')
await certificationDialog.waitFor({ timeout: 5000 })
await certificationDialog.getByRole('button', { name: 'Move to trash' }).click()
await page.getByText('was moved to the trash.').waitFor({ timeout: 10_000 })
await page
  .getByRole('row', { name: new RegExp(certificationName) })
  .waitFor({ state: 'detached', timeout: 10_000 })
  .catch(() => {})
check(
  (await page.getByRole('row', { name: new RegExp(certificationName) }).count()) === 0,
  'deleting a certification removes it from the table',
)

// ---------------------------------------------------------------- profile
const publicProfileBefore = await (await page.request.get(`${BASE_URL}/api/profile`)).json()

await page.getByRole('link', { name: 'Profile', exact: true }).first().click()
await page.waitForURL('**/admin/profile')
check(
  await waitVisible(page.getByRole('heading', { name: 'Profile', exact: true })),
  'profile page renders',
)
check(await waitVisible(page.getByLabel('Display name')), 'the profile form loads')

await page.getByLabel('Display name').fill('Preview Name')
check(
  await waitVisible(page.locator('aside').getByText('Preview Name')),
  'the profile preview reflects unsaved input',
)

// Server validation: required identity fields.
await page.getByLabel('Display name').fill('')
await page.getByLabel('Professional headline').fill('')
await page.getByLabel('Biography').fill('')
await page.getByRole('button', { name: 'Save profile' }).click()
await page.getByRole('alert').waitFor({ timeout: 5000 })
check(
  await waitVisible(page.getByText('Enter the display name.')),
  'profile validation errors are shown next to the field',
)

// Server validation: unsafe link values are rejected.
await page.getByLabel('Display name').fill('Preview Name')
await page.getByLabel('Professional headline').fill('Preview headline')
await page.getByLabel('Biography').fill('Preview biography text for the profile form.')
await page.getByLabel('Website URL').fill('not-a-url')
await page.getByRole('button', { name: 'Save profile' }).click()
check(
  await waitVisible(page.getByText('Enter a valid http(s) URL.')),
  'invalid profile links are rejected by the server',
)

const publicAfterInvalid = await (await page.request.get(`${BASE_URL}/api/profile`)).json()
check(
  JSON.stringify(publicAfterInvalid) === JSON.stringify(publicProfileBefore),
  'invalid profile submissions do not change public data',
)

if (publicProfileBefore.profile) {
  await page.getByLabel('Website URL').fill('https://example.com/e2e-profile')
  await page.getByLabel('GitHub URL').fill('https://github.com/e2e-profile')
  await page.getByLabel('Location').fill('Verification City')
  await page.getByLabel('Public email').fill('e2e@example.com')
  await page.getByRole('button', { name: 'Save profile' }).click()
  const saveSucceeded = await page
    .getByText('Profile saved and published.')
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
  check(saveSucceeded, 'saving the profile reports success')

  const savedProfile = await (await page.request.get(`${BASE_URL}/api/profile`)).json()
  check(
    savedProfile.profile?.websiteUrl === 'https://example.com/e2e-profile' &&
      savedProfile.profile?.publicEmail === 'e2e@example.com',
    'saving the profile publishes approved public fields',
  )
  check(
    savedProfile.profile &&
      !('id' in savedProfile.profile) &&
      !('updatedAt' in savedProfile.profile),
    'the public profile omits system fields',
  )

  // Restore the previous values so verification does not alter real content.
  // Reuse the page's CSRF cookie instead of rotating it, so the SPA's cached
  // token stays valid for later revoke requests.
  const csrfCookie = (await context.cookies()).find((cookie) => cookie.name === 'csrf_token')
  const restore = await page.request.patch(`${BASE_URL}/api/admin/profile`, {
    headers: { 'x-csrf-token': csrfCookie?.value ?? '' },
    data: publicProfileBefore.profile,
  })
  check(restore.ok(), 'the profile is restored after verification')
}

await audit('the profile page')

// ---------------------------------------------------------- activity log
await page.getByRole('link', { name: 'Activity log' }).first().click()
await page.waitForURL('**/admin/audit-logs')
check(
  await waitVisible(page.getByRole('heading', { name: 'Activity log', exact: true })),
  'activity log renders',
)
check(
  await waitVisible(page.getByRole('cell', { name: 'Experience moved to trash', exact: true }).first()),
  'the activity log lists recorded administrative events',
)
await audit('the activity log')

await Promise.all([
  page.waitForResponse(
    (response) =>
      response.url().includes('/api/admin/audit-logs') &&
      response.url().includes('entityType=Project') &&
      response.status() === 200,
    { timeout: 10_000 },
  ),
  page.getByLabel('Area').selectOption('Project'),
])
await page
  .getByRole('cell', { name: 'Project moved to trash', exact: true })
  .first()
  .waitFor({ timeout: 10_000 })

// The unfiltered table also contains "Project deleted" rows, so waiting for
// that cell alone can match the stale render. Assert on the filtered response:
// rows from other areas must be gone.
const otherAreasCleared = await page
  .waitForFunction(
    () =>
      ![...document.querySelectorAll('tbody tr')].some((row) =>
        row.textContent?.includes('Skill created'),
      ),
    undefined,
    { timeout: 10_000 },
  )
  .then(() => true)
  .catch(() => false)

check(otherAreasCleared, 'filtering the activity log by area excludes other areas')
check(
  (await page.getByRole('cell', { name: 'Project moved to trash', exact: true }).count()) > 0,
  'filtering by area keeps matching events',
)

await page.getByRole('button', { name: 'View details' }).first().click()
check(
  await waitVisible(page.getByText('Record identifier')),
  'an activity event exposes its safe details',
)
await page.getByRole('button', { name: 'Hide details' }).first().click()

await page.getByLabel('Search').fill('no-such-audit-event-xyz')
check(
  await waitVisible(page.getByText('No activity found')),
  'an unmatched activity search shows an empty state',
)
await Promise.all([
  page.waitForResponse(
    (response) =>
      response.url().includes('/api/admin/audit-logs') && response.status() === 200,
    { timeout: 10_000 },
  ),
  page.getByRole('button', { name: 'Clear filters' }).first().click(),
])
check(
  await waitVisible(page.getByRole('cell', { name: 'Experience moved to trash', exact: true }).first()),
  'clearing activity filters restores the log',
)

// ------------------------------------------------------ contact inbox
await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle' })
check(
  await waitVisible(page.getByRole('button', { name: 'Send message' })),
  'the public contact page renders the message form',
)

await page.getByRole('button', { name: 'Send message' }).click()
check(
  await waitVisible(page.getByText('Enter your name (at least 2 characters).')),
  'submitting an empty contact form shows field-level validation',
)

await page.locator('#contact-name').fill(contactName)
await page.locator('#contact-email').fill(contactEmail)
await page.locator('#contact-subject').fill(contactSubject)
await page.locator('#contact-message').fill(contactMessage)
await page.getByRole('button', { name: 'Send message' }).click()

check(
  await waitVisible(page.getByText('Message received.')),
  'a valid submission shows the server confirmation only after acceptance',
)

await page.goto(`${BASE_URL}/admin/messages`, { waitUntil: 'networkidle' })
check(
  await waitVisible(page.getByRole('heading', { name: 'Messages', exact: true })),
  'the admin inbox renders',
)

await page.locator('#message-search').fill(contactSubject)
const messageRow = page.getByRole('row', { name: new RegExp(contactName) })
check(await waitVisible(messageRow), 'the submitted message appears in the inbox')
check(
  (await messageRow.getByText('New', { exact: true }).count()) === 1,
  'a new submission is marked as new',
)

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Export CSV' }).click(),
])

check(
  /^messages-\d{4}-\d{2}-\d{2}\.csv$/.test(download.suggestedFilename()),
  `the export downloads a dated CSV file (${download.suggestedFilename()})`,
)

const csvPath = await download.path()
const csv = csvPath ? readFileSync(csvPath, 'utf8') : ''
check(csv.charCodeAt(0) === 0xfeff, 'the export includes a UTF-8 BOM for spreadsheets')
check(
  csv.includes('"Received","Name","Email","Subject","Message","Status"'),
  'the export has the documented header row',
)
check(
  csv.includes(`"'${contactSubject}"`),
  'the export guards formula-like cells from spreadsheet injection',
)
check(
  csv.includes(contactName) && csv.includes(contactEmail),
  'the export contains the filtered message sender',
)
check(csv.includes('"NEW"'), 'the export includes the message status')
check(
  await waitVisible(page.getByText('1 message exported as CSV.')),
  'the inbox confirms the export',
)

await messageRow.getByRole('button', { name: `Open message from ${contactName}` }).click()
check(
  await waitVisible(page.getByRole('heading', { name: contactSubject })),
  'opening a message shows its full detail',
)
check(
  (await page.getByText('This message was submitted by the automated').count()) === 1,
  'the inbox renders the full message text as plain text',
)

await page.getByRole('button', { name: 'Mark as read' }).click()
await page.getByText(`Message from ${contactName} marked as read.`).waitFor({ timeout: 10_000 })
check(
  (await page.getByRole('button', { name: 'Mark as unread' }).count()) === 1,
  'marking a message as read updates its actions',
)

await page.getByRole('button', { name: 'Archive', exact: true }).click()
await page.getByText(`Message from ${contactName} archived.`).waitFor({ timeout: 10_000 })
check(
  (await page.getByRole('button', { name: 'Move to inbox' }).count()) === 1,
  'archiving a message updates its status controls',
)
await audit('the admin inbox')

await page.getByRole('button', { name: 'Delete', exact: true }).click()
const messageDialog = page.getByRole('dialog')
await messageDialog.waitFor({ timeout: 5000 })
await messageDialog.getByRole('button', { name: 'Delete message' }).click()
await page.getByText(`Message from ${contactName} was deleted.`).waitFor({ timeout: 10_000 })
check(
  (await page.getByText(`Message from ${contactName} was deleted.`).count()) === 1,
  'deleting a message reports success',
)

// ----------------------------------------------------- purge own fixtures
// The verifier moves several records to the trash; remove them while the
// session is still signed in (sign-out happens later) so repeated runs never
// clutter the developer's trash.
const trashBefore = await page.request.get(`${BASE_URL}/api/admin/trash?pageSize=50`)
const trashPayload = trashBefore.ok() ? await trashBefore.json() : null
const ownTrashed = (trashPayload?.items ?? []).filter((item) => item.title.startsWith('E2E'))

if (ownTrashed.length > 0) {
  const purgeResponse = await page.request.post(`${BASE_URL}/api/admin/trash/purge`, {
    headers: { 'x-csrf-token': await currentCsrfToken() },
    data: { items: ownTrashed.map((item) => ({ type: item.type, id: item.id })) },
  })
  check(purgeResponse.ok(), 'the verifier purges the fixtures it trashed')

  const trashAfter = await page.request.get(`${BASE_URL}/api/admin/trash?pageSize=50`)
  const afterPayload = trashAfter.ok() ? await trashAfter.json() : null
  const remaining = (afterPayload?.items ?? []).filter((item) => item.title.startsWith('E2E'))
  check(remaining.length === 0, 'no verifier fixtures remain in the trash')
}

// ------------------------------------------------------------- sessions
// A second browser signs in so the first can revoke its session.
const otherContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const otherPage = await otherContext.newPage()
await otherPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' })
await otherPage.getByLabel('Email').fill(ADMIN_EMAIL)
await otherPage.getByLabel('Password').fill(ADMIN_PASSWORD)
await otherPage.getByRole('button', { name: 'Sign in' }).click()
await otherPage.waitForURL('**/admin', { timeout: 10_000 })

await page.getByRole('link', { name: 'Sessions' }).first().click()
await page.waitForURL('**/admin/sessions')
check(
  await waitVisible(page.getByRole('heading', { name: 'Sessions', exact: true })),
  'sessions page renders',
)
check(await waitVisible(page.getByText('This device')), 'the current session is marked')

const sessionRows = page.locator('tbody tr')
check((await sessionRows.count()) >= 2, 'another active session is listed after signing in elsewhere')
await audit('the sessions page')

// The newest other session belongs to the second browser context.
await sessionRows.nth(1).getByRole('button', { name: /^Revoke session:/ }).click()
const sessionDialog = page.getByRole('dialog')
await sessionDialog.waitFor({ timeout: 5000 })
await sessionDialog.getByRole('button', { name: 'Revoke session' }).click()
await page.getByText('That session was revoked.').waitFor({ timeout: 10_000 })
check(
  (await page.getByText('That session was revoked.').count()) === 1,
  'revoking another session reports success',
)

await otherPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
check(
  otherPage.url().endsWith('/admin/login'),
  'a revoked session can no longer reach the admin area',
)
await otherContext.close()

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
  (message) =>
    !/status of (400|401|403)/.test(message) &&
    !(
      removedPortraitPreviewPath &&
      message.includes(removedPortraitPreviewPath) &&
      /status of 404/.test(message)
    ),
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
