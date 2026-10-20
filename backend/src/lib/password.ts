import { Algorithm, hash, verify } from '@node-rs/argon2'

/**
 * Argon2id parameters follow current OWASP guidance (19 MiB, 2 iterations,
 * 1 lane). Benchmarked lazily so a single hash stays well under 100ms.
 */
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    // A malformed stored hash must fail closed, not throw.
    return false
  }
}

let dummyHash: string | undefined

/**
 * Performs a real Argon2id verification against a throwaway hash so that
 * "unknown email" and "wrong password" take comparable time, avoiding a
 * user-enumeration timing signal.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= await hashPassword('timing-equalisation-placeholder-value')
  await verifyPassword(dummyHash, password)
}
