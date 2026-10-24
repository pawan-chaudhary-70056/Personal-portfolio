import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { env } from '../config/env.js'

/**
 * TOTP (RFC 6238) and recovery-code primitives. Implemented locally so the
 * second factor introduces no dependency, and so the code can be reused by the
 * tests to generate valid codes.
 */

export const TOTP_DIGITS = 6
export const TOTP_PERIOD_SECONDS = 30
export const TOTP_ISSUER = 'Portfolio'
export const RECOVERY_CODE_COUNT = 10

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
/** Unambiguous alphabet: no I, O, 0, or 1. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RECOVERY_CODE_LENGTH = 10

export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

export function base32Decode(value: string): Buffer | null {
  const normalized = value.replaceAll(/\s+/g, '').toUpperCase()

  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) {
    return null
  }

  const bytes: number[] = []
  let bits = 0
  let buffer = 0

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    buffer = (buffer << 5) | index
    bits += 5

    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

function totpForStep(key: Buffer, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))

  const digest = createHmac('sha1', key).update(counter).digest()
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff)

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

export function currentTotpStep(at: number = Date.now()): number {
  return Math.floor(at / 1000 / TOTP_PERIOD_SECONDS)
}

/** Generates the code for a step; used by tests and by nothing else. */
export function generateTotpCode(secret: string, at: number = Date.now()): string {
  const key = base32Decode(secret)

  if (!key) {
    throw new Error('Invalid TOTP secret')
  }

  return totpForStep(key, currentTotpStep(at))
}

export function normalizeTotpCode(code: string): string {
  return code.replaceAll(/\s+/g, '')
}

export interface TotpVerification {
  ok: boolean
  /** The accepted time step, so the caller can reject replays. */
  step: number
}

/**
 * Accepts the current step plus one step of clock drift either way. A step that
 * has already been used is rejected, so an observed code cannot be replayed.
 */
export function verifyTotpCode(
  secret: string,
  code: string,
  options: { at?: number; window?: number; afterStep?: number | null } = {},
): TotpVerification {
  const normalized = normalizeTotpCode(code)

  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(normalized)) {
    return { ok: false, step: 0 }
  }

  const key = base32Decode(secret)

  if (!key) {
    return { ok: false, step: 0 }
  }

  const window = options.window ?? 1
  const current = currentTotpStep(options.at)
  const minimumStep = options.afterStep ?? -1

  for (let step = current - window; step <= current + window; step += 1) {
    if (step <= minimumStep) {
      continue
    }

    const expected = Buffer.from(totpForStep(key, step))
    const provided = Buffer.from(normalized)

    if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
      return { ok: true, step }
    }
  }

  return { ok: false, step: 0 }
}

export function otpauthUri(secret: string, account: string): string {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_ISSUER,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })

  return `otpauth://totp/${label}?${params.toString()}`
}

/** Recovery codes are displayed grouped; storage and comparison use the raw value. */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = []

  for (let index = 0; index < RECOVERY_CODE_COUNT; index += 1) {
    let raw = ''

    for (let character = 0; character < RECOVERY_CODE_LENGTH; character += 1) {
      const byte = randomBytes(1)[0] ?? 0
      raw += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length] ?? 'A'
    }

    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`)
  }

  return codes
}

/** Uppercases and strips separators, so `abcde fghij` matches `ABCDE-FGHIJ`. */
export function normalizeRecoveryCode(code: string): string {
  return code.replaceAll(/[^a-z0-9]/gi, '').toUpperCase()
}

function encryptionKey(): Buffer {
  // Derived from the session secret so no additional deployment secret is
  // required. Rotating SESSION_SECRET invalidates stored MFA secrets, which is
  // documented in docs/10-security.md.
  return Buffer.from(
    hkdfSync('sha256', Buffer.from(env.SESSION_SECRET), Buffer.alloc(0), 'portfolio-mfa-secret-v1', 32),
  )
}

/** AES-256-GCM, versioned so the format can change without a migration. */
export function encryptSecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptSecret(value: string | null): string | null {
  if (!value) {
    return null
  }

  const [version, iv, tag, ciphertext] = value.split('.')

  if (version !== 'v1' || !iv || !tag || !ciphertext) {
    return null
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    // A rotated secret or tampered value fails closed.
    return null
  }
}
