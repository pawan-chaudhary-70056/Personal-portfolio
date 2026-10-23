import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import {
  listMessagesQuerySchema,
  messageIdSchema,
  updateMessageSchema,
} from '../../schemas/contact.schema.js'
import {
  deleteMessage,
  getMessage,
  listMessages,
  updateMessageStatus,
} from '../../services/messages.service.js'

export function createAdminMessagesRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = parseInput(listMessagesQuerySchema, req.query)
    res.json(await listMessages(query))
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(messageIdSchema, req.params.id)
    res.json({ message: await getMessage(id) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(messageIdSchema, req.params.id)
    const input = parseInput(updateMessageSchema, req.body)
    res.json({ message: await updateMessageStatus(id, input.status, requestContext(req)) })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(messageIdSchema, req.params.id)
    await deleteMessage(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
