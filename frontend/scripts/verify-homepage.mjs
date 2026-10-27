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

// --------------------------------------------------------- published data
async function publicJson(path) {
  const response = await fetch(`${BASE_URL}/api${path}`)
  if (!response.ok) {
    throw new Error(`GET /api${path} failed with ${response.status}`)
  }
  return response.json()
}

const [profileResponse, projectsResponse, skillsResponse, experienceResponse, educationResponse, certificationsResponse, homepageResponse] =
  await Promise.all([
    publicJson('/profile'),
    publicJson('/projects'),
    publicJson('/skills'),
    publicJson('/experience'),
    publicJson('/education'),
    publicJson('/certifications'),
    publicJson('/portfolio/homepage'),
  ])

const publishedProfile = profileResponse.profile
const publishedProjects = projectsResponse.projects
const featuredProjects = publishedProjects.filter((project) => project.featured)

// The dashboard selection wins over each project's featured flag, exactly like
// FeaturedWork. References the public endpoint dropped resolve to nothing.
const selectedFeatured = homepageResponse.homepage.featuredProjects
  .map((reference) => publishedProjects.find((project) => project.id === reference.id))
  .filter(Boolean)
const displayedProjects =
  selectedFeatured.length > 0
    ? selectedFeatured
    : featuredProjects.length > 0
      ? featuredProjects
      : publishedProjects

// ---------------------------------------------------------------- desktop
const { page, context } = await openPage({ viewport: { width: 1440, height: 900 } })

const heading = (await page.locator('h1').innerText()).replace(/\s+/g, ' ').trim()
const expectedHeading = publishedProfile ? publishedProfile.headline : 'Profile coming soon.'
check(
  heading === expectedHeading,
  `hero headline comes from the public profile ("${heading}")`,
)
check(
  publishedProfile
    ? (await page.locator('body').innerText()).includes(publishedProfile.displayName)
    : (await page.locator('body').innerText()).includes('not published'),
  'the hero reflects whether a public profile exists',
)

const h1Count = await page.locator('h1').count()
check(h1Count === 1, `exactly one h1 on the page (found ${h1Count})`)

// The hero portrait comes from the published homepage state; either the managed
// image or the built-in fallback is acceptable, but the frame must always exist.
const heroPortrait = page.locator('[data-hero-portrait]')
const heroPortraitState = await heroPortrait.getAttribute('data-hero-portrait')
const heroPortraitBox = await heroPortrait.boundingBox()
check(
  heroPortraitState === 'image' || heroPortraitState === 'fallback',
  `the hero portrait renders (${heroPortraitState})`,
)
check(
  Boolean(heroPortraitBox && heroPortraitBox.width > 0 && heroPortraitBox.height > 0),
  'the hero portrait reserves visible space',
)
if (heroPortraitState === 'image') {
  const portraitImage = page.locator('[data-hero-portrait] img')
  check((await portraitImage.count()) === 1, 'the managed portrait image is displayed')
  check(
    Boolean((await portraitImage.getAttribute('alt'))?.trim()),
    'the published portrait has alternative text',
  )
} else {
  check(
    (await heroPortrait.innerText()).toLowerCase().includes('portrait'),
    'the fallback portrait panel is shown',
  )
}

const sectionIds = await page.$$eval('main section[id]', (nodes) => nodes.map((n) => n.id))
// The hero is always first; the rest follow the published homepage layout.
const expectedSections = [
  'top',
  ...homepageResponse.homepage.sections
    .filter((section) => section.visible)
    .map((section) => section.key),
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
check(
  projectCards === displayedProjects.length,
  `project cards match published projects (${projectCards}/${displayedProjects.length})`,
)

const bodyText = await page.locator('body').innerText()
check(
  skillsResponse.skills.length === 0 ||
    skillsResponse.skills.every((skill) => bodyText.includes(skill.name)),
  'published skills render on the homepage',
)
check(
  educationResponse.education.length === 0 ||
    educationResponse.education.every((entry) => bodyText.includes(entry.qualification)),
  'published education renders on the homepage',
)
check(
  certificationsResponse.certifications.length === 0 ||
    certificationsResponse.certifications.every((entry) => bodyText.includes(entry.name)),
  'published certifications render on the homepage',
)
check(
  experienceResponse.experience.length === 0 ||
    experienceResponse.experience.every((entry) => bodyText.includes(entry.role)),
  'published experience renders on the homepage',
)

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

// Contrast of the primary CTA: gold background with charcoal text. The hero
// only renders that button when a profile is published and there is work to
// link to (see Hero.tsx), so the expectation follows whatever is published
// rather than assuming the database has content.
const ctaContrast = await page.evaluate(() => {
  const cta = document.querySelector('#top a[href="/projects"]')
  if (!cta) return null
  const style = getComputedStyle(cta)
  return { color: style.color, background: style.backgroundColor }
})
if (publishedProfile && publishedProjects.length > 0) {
  check(
    ctaContrast?.color === 'rgb(17, 17, 16)' && ctaContrast?.background === 'rgb(198, 170, 120)',
    `primary CTA uses charcoal-on-gold (${JSON.stringify(ctaContrast)})`,
  )
} else {
  check(
    ctaContrast === null,
    `the hero omits the primary CTA when nothing is published (${JSON.stringify(ctaContrast)})`,
  )
}

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
  await mobilePage.locator('#mobile-navigation a[href="/about"]').isVisible(),
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
const reducedTiltIsStatic = await reduced.page.evaluate(() => {
  const tilt = document.querySelector('[data-hero-portrait] .hero-portrait-tilt')
  if (!tilt) return false
  return tilt.classList.contains('hero-portrait-static')
})
check(reducedTiltIsStatic, 'reduced motion disables the portrait tilt')
await reduced.context.close()

// ----------------------------------------------------------- public routes
const routes = await browser.newPage()
routes.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
routes.on('pageerror', (error) => pageErrors.push(error.message))

const publicRoutes = [
  { path: '/about', heading: publishedProfile?.displayName ?? 'About the portfolio' },
  { path: '/projects', heading: 'Projects, in full.' },
  { path: '/experience', heading: 'Professional history.' },
  { path: '/contact', heading: 'Start a conversation.' },
]

for (const route of publicRoutes) {
  await routes.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' })

  const h1Count = await routes.locator('main h1').count()
  const heading = (await routes.locator('main h1').innerText()).replace(/\s+/g, ' ').trim()
  check(h1Count === 1, `${route.path} renders exactly one main heading`)
  check(heading === route.heading, `${route.path} heading comes from published content ("${heading}")`)

  const currentLinks = await routes.locator('header nav a[aria-current="page"]').count()
  check(currentLinks === 1, `${route.path} marks exactly one current nav item`)

  const overflow = await routes.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  check(overflow <= 0, `${route.path} has no horizontal overflow (${overflow}px)`)

  const routeAxe = await routes.evaluate(async (source) => {
    // eslint-disable-next-line no-eval
    eval(source)
    return window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    })
  }, axeSource)

  const routeViolations = routeAxe.violations.map(
    (violation) => `${violation.id} (${violation.nodes.length}): ${violation.help}`,
  )
  check(
    routeViolations.length === 0,
    `${route.path} has no WCAG A/AA violations (${routeViolations.join(' | ')})`,
  )

  if (routeAxe.violations.length > 0) {
    for (const violation of routeAxe.violations) {
      for (const node of violation.nodes) {
        results.push(
          `      ${violation.id} ${node.target.join(' ')} :: ${violation.failureSummary?.replace(/\n/g, ' ')}`,
        )
      }
    }
  }
}

// The contact page must expose a working form, not just published details.
await routes.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle' })
check(await routes.locator('#contact-name').isVisible(), 'the contact page renders the message form')
await routes.getByRole('button', { name: 'Send message' }).click()
const nameErrorShown = await routes
  .getByText('Enter your name (at least 2 characters).')
  .waitFor({ timeout: 5000 })
  .then(() => true)
  .catch(() => false)
check(nameErrorShown, 'the contact form shows field-level client validation')
check(
  (await routes.getByText('Enter a valid email address.').count()) === 1,
  'the contact form validates the email format before submitting',
)

// The listing must match the public endpoint and navigate into details.
await routes.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
const listedProjects = await routes.locator('#project-list article').count()
check(
  listedProjects === publishedProjects.length,
  `/projects lists every published project (${listedProjects}/${publishedProjects.length})`,
)

if (publishedProjects.length > 0) {
  const targetProject = publishedProjects[0]
  await routes.locator(`#project-list a[href="/projects/${targetProject.slug}"]`).first().click()
  await routes.waitForURL(`**/projects/${targetProject.slug}`)
  // Client-side rendering swaps the page after the URL changes.
  await routes.waitForFunction(
    (title) => document.querySelector('main h1')?.textContent?.trim() === title,
    targetProject.title,
  )
  const detailHeading = (await routes.locator('main h1').innerText()).replace(/\s+/g, ' ').trim()
  check(
    detailHeading === targetProject.title,
    `/projects/:slug opens the selected project ("${detailHeading}")`,
  )
  const detailText = await routes.locator('main').innerText()
  check(
    detailText.includes(targetProject.summary),
    'the project detail page shows the published summary',
  )

  const relatedSection = routes.locator('#related-projects')
  if (publishedProjects.length > 1) {
    check(await relatedSection.isVisible(), 'the detail page shows a related-projects section')
    check(
      (await relatedSection.locator('article').count()) ===
        Math.min(3, publishedProjects.length - 1),
      'related projects show up to three other published projects',
    )
    check(
      !(await relatedSection.innerText()).includes(targetProject.title),
      'related projects exclude the project being viewed',
    )
  } else {
    check(
      (await relatedSection.count()) === 0,
      'no related-projects section is rendered for a single published project',
    )
  }

  const gallerySection = routes.locator('#screenshots')
  const screenshotCount = targetProject.screenshots?.length ?? 0

  if (screenshotCount > 0) {
    check(await gallerySection.isVisible(), 'the detail page renders the screenshot gallery')
    check(
      (await gallerySection.locator('img').count()) === screenshotCount,
      'every published screenshot renders in the gallery',
    )
    const missingAlt = await gallerySection
      .locator('img')
      .evaluateAll((nodes) => nodes.filter((node) => !node.getAttribute('alt')).length)
    check(missingAlt === 0, 'every gallery image carries alt text')
  } else {
    check(
      (await gallerySection.count()) === 0,
      'no gallery section is rendered when the project has no screenshots',
    )
  }
}

await routes.goto(`${BASE_URL}/projects/not-a-real-project`, { waitUntil: 'networkidle' })
const missingProjectHeading = (await routes.locator('main h1').innerText()).trim()
check(
  missingProjectHeading.includes('not available'),
  `unknown project slugs show a not-found state ("${missingProjectHeading}")`,
)

// Deep links to in-page sections survive the shared content request.
await routes.goto(`${BASE_URL}/about#skills`, { waitUntil: 'networkidle' })
await routes.waitForTimeout(400)
const skillsInView = await routes.evaluate(() => {
  const skills = document.getElementById('skills')
  if (!skills) return false
  const { top, bottom } = skills.getBoundingClientRect()
  return bottom > 0 && top < window.innerHeight
})
check(skillsInView, 'deep links to /about#skills scroll to the skills section')

await routes.screenshot({ path: 'scripts/projects-desktop.png', fullPage: true })
await routes.close()

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
