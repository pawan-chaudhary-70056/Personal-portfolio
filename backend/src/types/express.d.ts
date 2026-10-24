import type { AdminIdentity } from '../lib/auth-types.js'

declare module 'express-session' {
  interface SessionData {
    adminId?: string
    /** Epoch milliseconds of the original authentication, for the absolute timeout. */
    loggedInAt?: number
    /** Sanitised browser description shown on the session-management screen. */
    userAgent?: string
    /** Password verified, second factor still outstanding. No adminId yet. */
    pendingMfaAdminId?: string
    /** Epoch milliseconds of the password step, for the challenge timeout. */
    pendingMfaAt?: number
    pendingMfaAttempts?: number
  }
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminIdentity
    }
  }
}

export {}
