import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z.string().min(1).default('portfolio.sid'),
  FRONTEND_ORIGIN: z.string().min(1).optional(),
  /** Failed sign-in attempts allowed per 15 minutes, per client IP. */
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n')

  console.error(`Invalid environment configuration:\n${problems}`)
  process.exit(1)
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
}
