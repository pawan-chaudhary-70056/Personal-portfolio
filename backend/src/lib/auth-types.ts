import type { AdminRole } from '@prisma/client'

/** Fields safe to expose to the client and attach to an authenticated request. */
export interface AdminIdentity {
  id: string
  email: string
  name: string
  role: AdminRole
}

/** Authenticated actor plus request metadata recorded in audit events. */
export interface RequestContext {
  adminId: string
  ip?: string
  userAgent?: string
}

/** Absolute session lifetime, independent of the idle timeout. */
export const ABSOLUTE_SESSION_MS = 12 * 60 * 60 * 1000

/** Idle timeout applied through the session cookie. */
export const IDLE_SESSION_MS = 8 * 60 * 60 * 1000
