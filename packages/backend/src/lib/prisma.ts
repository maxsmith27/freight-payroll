import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from './logger.js'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(prisma as any).$on('query', (e: Prisma.QueryEvent) => {
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug(`Query: ${e.query} — ${e.duration}ms`)
    }
  })
}

export default prisma
