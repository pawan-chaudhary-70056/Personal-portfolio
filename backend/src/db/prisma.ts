import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : [],
  })

if (!env.isProduction) {
  globalForPrisma.prisma = prisma
}
