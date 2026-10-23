/**
 * Visual QA helper: captures screenshots of the main public and admin screens
 * plus a keyboard-focus report, so review does not need a hand-driven session.
 *
 * Requires the API (4000) and Vite dev server (5173), like verify:admin:
 *
 *   node scripts/capture-screens.mjs          # writes .qa/screenshots/*.png
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://127.0.0.1:5173'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'owner@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Dev-Only-Passphrase-2026!'
const OUT_DIR = join(process.cwd(), '.qa', 'screenshots')

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const report = []

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path })
  console.log(`captured ${name}.png`)
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

// ------------------------------------------------------------- public pages
await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
await shot(page, 'public-home-desktop')

// Keyboard: walk the first tab stops and record where focus lands.
const focusTrail = []
for (let i = 0; i < 8; i += 1) {
  await page.keyboard.press('Tab')
  focusTrail.push(
    await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return 'none'
      const style = getComputedStyle(el)
      const visible =
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        (el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0)
      return `${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}] visible=${visible}`
    }),
  )
}
report.push(`Homepage tab order:\n  ${focusTrail.join('\n  ')}`)

await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
await shot(page, 'public-projects-desktop')

const projectLink = page.locator('a[href^="/projects/"]').first()
if ((await projectLink.count()) > 0) {
  const href = await projectLink.getAttribute('href')
  await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle' })
  await shot(page, 'public-project-detail-desktop')
}

await page.goto(`${BASE_URL}/experience`, { waitUntil: 'networkidle' })
await shot(page, 'public-experience-desktop')

await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle' })
await shot(page, 'public-contact-desktop')

await page.goto(`${BASE_URL}/this-page-does-not-exist`, { waitUntil: 'networkidle' })
await shot(page, 'public-404-desktop')

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})
const mobilePage = await mobile.newPage()
await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
await shot(mobilePage, 'public-home-mobile')
await mobilePage.close()

// --------------------------------------------------------------- admin pages
await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' })
await page.getByLabel('Email').fill(ADMIN_EMAIL)
await page.getByLabel('Password').fill(ADMIN_PASSWORD)
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL('**/admin', { timeout: 15_000 })
await page.waitForLoadState('networkidle')
await shot(page, 'admin-overview')

for (const [path, name] of [
  ['/admin/projects', 'admin-projects'],
  ['/admin/trash', 'admin-trash'],
  ['/admin/revisions', 'admin-revisions'],
  ['/admin/media', 'admin-media'],
  ['/admin/messages', 'admin-messages'],
  ['/admin/homepage', 'admin-homepage'],
  ['/admin/scheduling', 'admin-scheduling'],
]) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await shot(page, name)
}

// Revisions: open the first snapshot so the diff preview is captured too.
await page.goto(`${BASE_URL}/admin/revisions`, { waitUntil: 'networkidle' })
const viewSnapshot = page.getByRole('button', { name: 'View snapshot' }).first()
if ((await viewSnapshot.count()) > 0) {
  await viewSnapshot.click()
  await page.getByText('Changes in this revision').first().waitFor({ timeout: 10_000 })
  await shot(page, 'admin-revisions-diff')
}

const adminMobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  storageState: await context.storageState(),
})
const adminMobilePage = await adminMobile.newPage()
await adminMobilePage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
await shot(adminMobilePage, 'admin-overview-mobile')

writeFileSync(join(process.cwd(), '.qa', 'keyboard-focus.txt'), `${report.join('\n\n')}\n`)

await browser.close()
console.log(`\nScreenshots written to ${OUT_DIR}`)
console.log('Keyboard report: .qa/keyboard-focus.txt')
