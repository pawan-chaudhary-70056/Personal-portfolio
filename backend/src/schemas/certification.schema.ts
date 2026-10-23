import { z } from 'zod'
import { optionalDateOnlySchema, optionalHttpUrlSchema, optionalTextSchema } from './common.schema.js'

const certificationFields = {
  name: z.string().trim().min(1, 'Enter the certification name.').max(160, 'Name is too long.'),
  issuingOrganization: z
    .string()
    .trim()
    .min(1, 'Enter the issuing organization.')
    .max(160, 'Organization is too long.'),
  issueDate: optionalDateOnlySchema,
  expiryDate: optionalDateOnlySchema,
  credentialId: optionalTextSchema(120),
  credentialUrl: optionalHttpUrlSchema,
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
} as const

const baseCertificationSchema = z.object(certificationFields)

function refineDates(
  value: { issueDate?: string | null; expiryDate?: string | null },
  context: z.RefinementCtx,
): void {
  if (value.issueDate && value.expiryDate && value.issueDate > value.expiryDate) {
    context.addIssue({
      code: 'custom',
      path: ['expiryDate'],
      message: 'The expiry date must be on or after the issue date.',
    })
  }
}

export const createCertificationSchema = baseCertificationSchema
  .partial({
    issueDate: true,
    expiryDate: true,
    credentialId: true,
    credentialUrl: true,
    sortOrder: true,
    published: true,
  })
  .strict()
  .superRefine(refineDates)

export const updateCertificationSchema = baseCertificationSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
  .superRefine(refineDates)

export const listCertificationsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
  })
  .strict()

export type CreateCertificationInput = z.infer<typeof createCertificationSchema>
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>
export type ListCertificationsQuery = z.infer<typeof listCertificationsQuerySchema>
