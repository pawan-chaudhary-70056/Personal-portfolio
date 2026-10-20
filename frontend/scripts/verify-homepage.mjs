/**
 * Homepage verification against the built app (vite preview).
 *
 * Run with the preview server up:
 *   npm run build && npm run preview -- --port 4173 --strictPort
 *   node scripts/verify-homepage.mjs
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const results = []

const pass = (message) => results.push(`PASS  ${message}`)
const fail = (message) => results.push(`FAIL  ${message}`)
const check = (condition, message) => (condition ? pass(message) : fail(message))

const browser = await chromium.launch()
const consoleErrors = []
const pageErrors = []

async function openPage(contextOptions) {
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  return { context, page }
}

// ---------------------------------------------------------------- desktop
const { page, context } = await openPage({ viewport: { width: 1440, height: 900 } })

const heading = await page.locator('h1').innerText()
check(
  heading.replace(/\s+/g, ' ').trim() === 'Building secure digital experiences.',
  `hero headline renders ("${heading.replace(/\s+/g, ' ').trim()}")`,
)

const h1Count = await page.locator('h1').count()
check(h1Count === 1, `exactly one h1 on the page (found ${h1Count})`)

const sectionIds = await page.$$eval('main section[id]', (nodes) => nodes.map((n) => n.id))
const expectedSections = [
  'top',
  'about',
  'work',
  'skills',
  'experience',
  'credentials',
  'contact',
]
check(
  expectedSections.every((id) => sectionIds.includes(id)),
  `all homepage sections render (${sectionIds.join(', ')})`,
)

const deadAnchors = await page.evaluate(() => {
  const hrefs = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'))
  return [...new Set(hrefs)].filter((href) => href !== '#' && !document.querySelector(href))
})
check(deadAnchors.length === 0, `no dead in-page links (${deadAnchors.join(', ') || 'none'})`)

const projectCards = await page.locator('#work article').count()
check(projectCards === 4, `project cards render (${projectCards})`)

const bodyBackground = await page.evaluate(
  () => getComputedStyle(document.body).backgroundColor,
)
check(bodyBackground === 'rgb(17, 17, 16)', `body uses charcoal background (${bodyBackground})`)

const fonts = await page.evaluate(() => ({
  heading: getComputedStyle(document.querySelector('h1')).fontFamily,
  body: getComputedStyle(document.querySelector('p')).fontFamily,
  serifLoaded: document.fonts.check('16px "DM Serif Display"'),
  sansLoaded: document.fonts.check('16px "Inter Variable"'),
}))
check(fonts.heading.includes('DM Serif Display'), 'headings use the serif family')
check(fonts.body.includes('Inter'), 'body copy uses the sans-serif family')
check(fonts.serifLoaded && fonts.sansLoaded, 'both self-hosted fonts actually load')

const heroAnimation = await page.evaluate(() => {
  const eyebrow = document.querySelector('section#top .hero-enter')
  if (!eyebrow) return null
  const style = getComputedStyle(eyebrow)
  return { name: style.animationName, duration: style.animationDuration }
})
check(
  heroAnimation?.name === 'hero-enter' && heroAnimation?.duration === '0.6s',
  `hero entrance animation applies (${JSON.stringify(heroAnimation)})`,
)

// Reveals below the fold are meant to be pending until scrolled into view.
const revealCount = await page.locator('[data-reveal]').count()
check(revealCount > 0, `scroll reveal wrappers are present (${revealCount})`)

async function scrollThrough(target) {
  const height = await target.evaluate(() => document.body.scrollHeight)
  for (let offset = 0; offset < height; offset += 500) {
    await target.evaluate((top) => window.scrollTo(0, top), offset)
    await target.waitForTimeout(60)
  }
  await target.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await target.waitForTimeout(700)
}

await scrollThrough(page)

const revealStates = await page.$$eval('[data-reveal]', (nodes) =>
  nodes.map((node) => ({ state: node.dataset.reveal, opacity: getComputedStyle(node).opacity })),
)
check(
  revealStates.every(({ state }) => state === 'shown'),
  `every revealed section becomes visible after scrolling (${revealStates.map((r) => r.state).join(',')})`,
)
check(
  revealStates.every(({ opacity }) => Number(opacity) === 1),
  'revealed sections end at full opacity',
)

await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(200)

const overflowDesktop = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)
check(overflowDesktop <= 0, `no horizontal overflow at 1440px (${overflowDesktop}px)`)

// Contrast of the primary CTA: gold background with charcoal text.
const ctaContrast = await page.evaluate(() => {
  const cta = document.querySelector('#top a[href="#work"]')
  if (!cta) return null
  const style = getComputedStyle(cta)
  return { color: style.color, background: style.backgroundColor }
})
check(
  ctaContrast?.color === 'rgb(17, 17, 16)' && ctaContrast?.background === 'rgb(198, 170, 120)',
  `primary CTA uses charcoal-on-gold (${JSON.stringify(ctaContrast)})`,
)

await page.screenshot({ path: 'scripts/homepage-desktop.png', fullPage: true })

// axe accessibility audit
const axeResults = await page.evaluate(async (source) => {
  // eslint-disable-next-line no-eval
  eval(source)
  return window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
  })
}, axeSource)

const violations = axeResults.violations.map(
  (violation) => `${violation.id} (${violation.nodes.length}): ${violation.help}`,
)
check(violations.length === 0, `axe finds no WCAG A/AA violations (${violations.join(' | ')})`)

if (axeResults.violations.length > 0) {
  for (const violation of axeResults.violations) {
    for (const node of violation.nodes) {
      results.push(`      ${violation.id} ${node.target.join(' ')} :: ${node.failureSummary?.replace(/\n/g, ' ')}`)
    }
  }
}

await context.close()

// ----------------------------------------------------------------- mobile
const mobile = await openPage({ viewport: { width: 390, height: 844 } })
const mobilePage = mobile.page

const overflowMobile = await mobilePage.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)
check(overflowMobile <= 0, `no horizontal overflow at 390px (${overflowMobile}px)`)

const menuButton = mobilePage.locator('button[aria-controls="mobile-navigation"]')
check(await menuButton.isVisible(), 'mobile menu toggle is visible at 390px')
check(
  (await mobilePage.locator('#mobile-navigation').count()) === 0,
  'mobile menu panel is closed initially',
)

await menuButton.click()
const expanded = await menuButton.getAttribute('aria-expanded')
check(expanded === 'true', `toggle sets aria-expanded=true (got ${expanded})`)
check(
  await mobilePage.locator('#mobile-navigation a[href="#about"]').isVisible(),
  'mobile menu shows navigation links when open',
)

const bodyLocked = await mobilePage.evaluate(() => document.body.style.overflow)
check(bodyLocked === 'hidden', `background scroll is locked while open (${bodyLocked})`)

await mobilePage.keyboard.press('Escape')
check(
  (await mobilePage.locator('#mobile-navigation').count()) === 0,
  'Escape closes the mobile menu',
)
check(
  (await mobilePage.evaluate(() => document.body.style.overflow)) === '',
  'scroll lock is released after closing',
)
const focusReturned = await mobilePage.evaluate(
  () => document.activeElement?.getAttribute('aria-controls') === 'mobile-navigation',
)
check(focusReturned, 'focus returns to the menu toggle after closing')

await mobilePage.screenshot({ path: 'scripts/homepage-mobile.png', fullPage: true })
await mobile.context.close()

// --------------------------------------------------------- reduced motion
const reduced = await openPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
})
const reducedStates = await reduced.page.$$eval('[data-reveal]', (nodes) =>
  nodes.map((node) => node.dataset.reveal),
)
check(
  reducedStates.every((state) => state === 'shown'),
  'reduced motion shows all content without reveal animation',
)
const reducedAnimation = await reduced.page.evaluate(() => {
  const eyebrow = document.querySelector('section#top .hero-enter')
  return eyebrow ? getComputedStyle(eyebrow).animationDuration : null
})
// Browsers normalize 0.01ms to 1e-05s, so compare the parsed value.
check(
  reducedAnimation !== null && Number.parseFloat(reducedAnimation) * 1000 <= 0.02,
  `reduced motion disables the hero animation (${reducedAnimation})`,
)
await reduced.context.close()

// ------------------------------------------------------------------ 404
const notFound = await browser.newPage()
await notFound.goto(`${BASE_URL}/this-route-does-not-exist`, { waitUntil: 'networkidle' })
const notFoundHeading = await notFound.locator('h1').innerText()
check(
  notFoundHeading.includes('does not exist'),
  `unknown routes render the not-found page ("${notFoundHeading}")`,
)
await notFound.close()

// --------------------------------------------------------------- console
check(pageErrors.length === 0, `no uncaught page errors (${pageErrors.join(' | ') || 'none'})`)

// The public shell probes /api/auth/session; a 401 is the expected signed-out
// response, so only unexpected resource failures count as errors.
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
