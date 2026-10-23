import { z } from 'zod'
import { optionalTextSchema, recordIdSchema } from './common.schema.js'

export const messageStatusSchema = z.enum(['NEW', 'READ', 'ARCHIVED'])
export type MessageStatusValue = z.infer<typeof messageStatusSchema>

/**
 * Public submission contract (docs/07-backend-api.md §8.1).
 *
 * `website` is a honeypot: real visitors never see or fill it, so any value
 * means the request was automated. It is accepted by the schema and handled in
 * the route so bots receive an ordinary success response and no message is
 * stored.
 */
export const contactMessageSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name.').max(100, 'Name is too long.'),
    email: z
      .string()
      .trim()
      .max(254, 'Email is too long.')
      .email('Enter a valid email address.')
      .transform((value) => value.toLowerCase()),
    subject: optionalTextSchema(150),
    message: z
      .string()
      .trim()
      .min(10, 'Tell me a little more — at least 10 characters.')
      .max(5000, 'Message is too long.'),
    website: z.string().max(200).optional(),
  })
  .strict()

export const listMessagesQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    status: messageStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()

export const updateMessageSchema = z.object({ status: messageStatusSchema }).strict()

export const messageIdSchema = recordIdSchema

export type ContactMessageInput = z.infer<typeof contactMessageSchema>
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>
