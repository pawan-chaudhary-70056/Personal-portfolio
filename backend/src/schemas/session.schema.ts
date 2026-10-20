import { z } from 'zod'

/** Public session reference: the short fingerprint returned by the API. */
export const sessionFingerprintSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{16}$/, 'Invalid session reference.')
