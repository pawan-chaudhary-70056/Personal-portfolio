import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { parseInput } from '../../lib/validate.js'
import { contactMessageSchema } from '../../schemas/contact.schema.js'
import { createContactMessage } from '../../services/messages.service.js'

export interface ContactRouterOptions {
  /** Lowered in tests so the limiter can be exercised without long waits. */
  rateLimitMax?: number
}

const CONFIRMATION = 'Thank you. Your message has been received.'

export function createContactRouter(options: ContactRouterOptions = {}): Router {
  const router = Router()

  // A submission is expensive to abuse (it writes a row and may trigger email
  // later), so limit per IP over a quarter hour.
  const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.rateLimitMax ?? 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'rate_limited',
      message: 'Too many messages have been sent from this connection. Please try again later.',
    },
  })

  router.post('/', submitLimiter, async (req, res) => {
    const input = parseInput(contactMessageSchema, req.body)

    // Honeypot: accept silently so automated clients cannot tell they were
    // filtered, but never persist the submission.
    if (input.website) {
      res.status(201).json({ message: CONFIRMATION })
      return
    }

    await createContactMessage(input)
    res.status(201).json({ message: CONFIRMATION })
  })

  return router
}
