import { z } from 'zod'

/** A code is either six digits from an authenticator app or a recovery code. */
export const mfaCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(6, 'Enter the code from your authenticator app.')
      .max(32, 'That code is too long.'),
  })
  .strict()

export const mfaPasswordCodeSchema = z
  .object({
    password: z.string().min(1, 'Enter your password.').max(200, 'Password is too long.'),
    code: z.string().trim().min(6, 'Enter a code.').max(32, 'That code is too long.'),
  })
  .strict()

export type MfaCodeInput = z.infer<typeof mfaCodeSchema>
export type MfaPasswordCodeInput = z.infer<typeof mfaPasswordCodeSchema>
