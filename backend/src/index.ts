import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`)
})

let shuttingDown = false

function shutdown(signal: string): void {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.log(`Received ${signal}. Shutting down.`)

  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0))
  })

  // Do not hang forever on stuck connections.
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
