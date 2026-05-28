import { initialiseSentry } from './lib/sentry.js'
initialiseSentry()

import { app } from './app.js'
import { config } from './config/index.js'
import { logger } from './lib/logger.js'
import prisma from './lib/prisma.js'
import { sendAllComplianceAlerts } from './modules/compliance/compliance.service.js'

// ─── Daily compliance alert scheduler ───────────────────────────────────────
// Fires once per day. Calculates ms until next 08:00 AEST (UTC+10) so alerts
// land in inboxes at the start of the business day, not 3am.
function scheduleDailyComplianceAlerts() {
  const now = new Date()
  const nextRun = new Date(now)
  // Target 22:00 UTC = 08:00 AEST (+10)
  nextRun.setUTCHours(22, 0, 0, 0)
  if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1)
  const msUntilFirst = nextRun.getTime() - now.getTime()

  setTimeout(() => {
    sendAllComplianceAlerts().catch(err =>
      logger.error('Daily compliance alert run failed', { error: err }),
    )
    // Repeat every 24 hours thereafter
    setInterval(() => {
      sendAllComplianceAlerts().catch(err =>
        logger.error('Daily compliance alert run failed', { error: err }),
      )
    }, 24 * 60 * 60 * 1000)
  }, msUntilFirst)

  logger.info(`Compliance alerts scheduled — first run in ${Math.round(msUntilFirst / 60000)} minutes`)
}

// ─── Keep-alive ping ─────────────────────────────────────────────────────────
// Render's free tier spins down services after 15 minutes of inactivity,
// returning 405 on the next POST request before the service wakes up.
//
// IMPORTANT: the ping MUST use the external URL, not localhost.
// Render tracks activity via its edge network — localhost requests are
// internal socket calls that never touch Render's infrastructure, so they
// don't reset the inactivity timer and the service still sleeps.
//
// Render automatically injects RENDER_EXTERNAL_URL for all web services.
// We ping /health every 10 minutes via that URL so Render sees live traffic.
function keepAlive() {
  // RENDER_EXTERNAL_HOSTNAME is injected via render.yaml fromService reference.
  // It contains the bare hostname (e.g. freight-payroll-backend.onrender.com).
  // We prepend https:// so the request goes through Render's edge network,
  // which is what actually resets the inactivity timer.
  const url = config.RENDER_EXTERNAL_HOSTNAME
    ? `https://${config.RENDER_EXTERNAL_HOSTNAME}/health`
    : `http://localhost:${config.PORT}/health` // local dev only — never reaches Render

  if (!config.RENDER_EXTERNAL_HOSTNAME) {
    logger.warn('RENDER_EXTERNAL_HOSTNAME not set — keep-alive is using localhost and will NOT prevent sleep on Render')
  }

  setInterval(() => {
    fetch(url).catch(err => {
      logger.warn('Keep-alive ping failed', { url, error: String(err) })
    })
  }, 10 * 60 * 1000) // every 10 minutes — Render sleeps after 15 min inactivity

  logger.info(`Keep-alive ping enabled — target: ${url}`)
}

async function main() {
  // Test DB connection
  await prisma.$connect()
  logger.info('Database connected')

  const server = app.listen(config.PORT, () => {
    logger.info(`🚛 Freight Payroll API running on port ${config.PORT}`)
    logger.info(`Environment: ${config.NODE_ENV}`)
  })

  // Start daily compliance email scheduler (only in production to avoid noise in dev)
  if (config.NODE_ENV === 'production') {
    scheduleDailyComplianceAlerts()
    keepAlive()
  }

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
