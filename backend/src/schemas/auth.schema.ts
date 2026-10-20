import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, 'Email is too long.')
      .regex(EMAIL_PATTERN, 'Enter a valid email address.'),
    password: z.string().min(1, 'Enter your password.').max(200, 'Password is too long.'),
  })
  .strict()

export type LoginInput = z.infer<typeof loginSchema>
