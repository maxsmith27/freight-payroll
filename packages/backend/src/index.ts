import { initialiseSentry } from './lib/sentry.js'
initialiseSentry()

import { app } from './app.js'
import { config } from './config/index.js'
import { logger } from './lib/logger.js'
import prisma from './lib/prisma.js'

async function main() {
  // Test DB connection
  await prisma.$connect()
  logger.info('Database connected')

  const server = app.listen(config.PORT, () => {
    logger.info(`🚛 Freight Payroll API running on port ${config.PORT}`)
    logger.info(`Environment: ${config.NODE_ENV}`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`)
    server.close(async () => {
      await prisma.$disconnect()
      logger.info('Server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  logger.error('Failed to start server', { error: err })
  process.exit(1)
})
