import { existsSync } from 'node:fs'
import path from 'node:path'
import connectPgSimple from 'connect-pg-simple'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import session from 'express-session'
import helmet from 'helmet'
import { env } from './config/env.js'
import { IDLE_SESSION_MS } from './lib/auth-types.js'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import { verifyCsrf } from './middleware/csrf.js'
import { createAdminRouter } from './routes/admin/index.js'
import { createAuthRouter } from './routes/auth.routes.js'
import { createAnalyticsRouter } from './routes/public/analytics.routes.js'
import { createContactRouter } from './routes/public/contact.routes.js'
import { createPublicContentRouter } from './routes/public/content.routes.js'
import { createPublicHeroRouter } from './routes/public/hero.routes.js'
import { createPublicHomepageRouter } from './routes/public/homepage.routes.js'
import { createPublicMediaRouter } from './routes/public/media.routes.js'
import { getReadiness } from './services/readiness.service.js'
import { createPublicProjectsRouter } from './routes/public/projects.routes.js'

export interface CreateAppOptions {
  /** Test-only override for the login rate limit. */
  loginRateLimitMax?: number
  /** Test-only override for the second-factor rate limit. */
  mfaRateLimitMax?: number
  /** Test-only override for the contact submission rate limit. */
  contactRateLimitMax?: number
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express()

  app.disable('x-powered-by')

  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1)
  }

  app.use(helmet())
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  // Credentialed CORS is only needed if the frontend is served from another
  // origin. The default deployment keeps the API and SPA on one origin.
  if (env.FRONTEND_ORIGIN) {
    app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }))
  }

  const PgSessionStore = connectPgSimple(session)

  app.use(
    session({
      name: env.SESSION_COOKIE_NAME,
      secret: env.SESSION_SECRET,
      store: new PgSessionStore({
        conString: env.DATABASE_URL,
        tableName: 'session',
        // The table is owned by Prisma migrations (see prisma/schema.prisma).
        createTableIfMissing: false,
        pruneSessionInterval: 60 * 15,
      }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: IDLE_SESSION_MS,
      },
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Liveness answers whether the process is up; readiness answers whether it
  // can serve, so platform health checks and uptime monitors can alert on a
  // failed dependency instead of a healthy-looking process
  // (docs/12-deployment-and-maintenance.md §17).
  app.get('/api/ready', async (_req, res) => {
    const report = await getReadiness()
    res.status(report.status === 'error' ? 503 : 200).json(report)
  })

  // Applies to every state-changing request under /api.
  app.use('/api', verifyCsrf)

  app.use(
    '/api/auth',
    createAuthRouter({
      loginRateLimitMax: options.loginRateLimitMax ?? env.LOGIN_RATE_LIMIT_MAX,
      mfaRateLimitMax: options.mfaRateLimitMax,
    }),
  )
  app.use('/api/admin', createAdminRouter())
  app.use('/api/projects', createPublicProjectsRouter())
  app.use('/api/portfolio', createPublicHomepageRouter())
  app.use('/api/contact', createContactRouter({ rateLimitMax: options.contactRateLimitMax }))
  app.use('/api/analytics', createAnalyticsRouter())
  app.use('/api', createPublicContentRouter())
  app.use('/api', createPublicHeroRouter())
  app.use('/api', createPublicMediaRouter())

  // Single-origin deployment: serve the built SPA when it is available.
  if (env.isProduction) {
    const frontendDist = path.resolve(process.cwd(), '../frontend/dist')
    const indexHtml = path.join(frontendDist, 'index.html')

    if (existsSync(indexHtml)) {
      // Cache parity with frontend/nginx.conf: the shell must revalidate so a
      // new deployment is picked up, while content-hashed assets are immutable.
      app.use(
        express.static(frontendDist, {
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              res.setHeader('Cache-Control', 'no-cache')
            } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            }
          },
        }),
      )
      app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) {
          next()
          return
        }
        res.setHeader('Cache-Control', 'no-cache')
        res.sendFile(indexHtml)
      })
    }
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
