import { z } from 'zod'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Shared password policy for new accounts and resets. */
const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200, 'Password is too long.')

export const createAdministratorSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a name.').max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .regex(EMAIL_PATTERN, 'Enter a valid email address.'),
    password: passwordSchema,
    role: z.enum(['OWNER', 'EDITOR']).default('EDITOR'),
  })
  .strict()

export const updateAdministratorSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a name.').max(120).optional(),
    role: z.enum(['OWNER', 'EDITOR']).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const resetAdministratorPasswordSchema = z
  .object({ password: passwordSchema })
  .strict()

export type CreateAdministratorInput = z.infer<typeof createAdministratorSchema>
export type UpdateAdministratorInput = z.infer<typeof updateAdministratorSchema>
