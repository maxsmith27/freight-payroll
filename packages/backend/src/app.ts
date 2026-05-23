import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createReadStream } from 'node:fs'
import path from 'node:path'

import { config } from './config/index.js'
import { errorHandler } from './middleware/error.middleware.js'
import { requestAuditLogger } from './middleware/audit.middleware.js'
import { logger } from './lib/logger.js'

// Route modules
import { authRouter } from './modules/auth/auth.router.js'
import { ssoRouter } from './modules/auth/sso.router.js'
import { employeesRouter } from './modules/employees/employees.router.js'
import { companiesRouter } from './modules/companies/companies.router.js'
import { payrollRouter } from './modules/payroll/payroll.router.js'
import { timeAttendanceRouter } from './modules/timeAttendance/timeAttendance.router.js'
import { leaveRouter } from './modules/leave/leave.router.js'
import { rosteringRouter } from './modules/rostering/rostering.router.js'
import { complianceRouter } from './modules/compliance/compliance.router.js'
import { reportsRouter } from './modules/reports/reports.router.js'
import { selfServiceRouter } from './modules/selfService/selfService.router.js'
import { ratesRouter } from './modules/admin/rates.router.js'
import { auditRouter } from './modules/admin/audit.router.js'

const app = express()

app.set('trust proxy', 1)

// ─── Security ──────────────────────────────────────────────────────────────

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Tighter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many authentication attempts' },
})

// ─── Middleware ─────────────────────────────────────────────────────────────

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

if (config.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  )
}

// ─── Health check ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authLimiter, authRouter)
app.use('/api/v1/auth/sso', ssoRouter)
app.use('/api/v1/companies', requestAuditLogger, companiesRouter)
app.use('/api/v1/employees', requestAuditLogger, employeesRouter)
app.use('/api/v1/payroll', requestAuditLogger, payrollRouter)
app.use('/api/v1/time-attendance', requestAuditLogger, timeAttendanceRouter)
app.use('/api/v1/leave', requestAuditLogger, leaveRouter)
app.use('/api/v1/roster', requestAuditLogger, rosteringRouter)
app.use('/api/v1/compliance', requestAuditLogger, complianceRouter)
app.use('/api/v1/reports', reportsRouter)
app.use('/api/v1/self-service', selfServiceRouter)
app.use('/api/v1/admin/rates', ratesRouter)
app.use('/api/v1/admin/audit-logs', auditRouter)

// ─── Local file serving (dev only) ──────────────────────────────────────────
// In production, files are served via S3 pre-signed URLs; this route is never reached.
if (config.STORAGE_DRIVER === 'local') {
  app.get('/files/*', (req: express.Request, res: express.Response) => {
    const key = (req.params as unknown as Record<string, string>)[0]
    const filePath = path.join(config.STORAGE_LOCAL_PATH, key)
    const stream = createReadStream(filePath)
    stream.on('error', () => res.status(404).json({ error: 'File not found' }))
    stream.pipe(res)
  })
}

// ─── 404 handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ─── Error handler ──────────────────────────────────────────────────────────

app.use(errorHandler)
Sentry.setupExpressErrorHandler(app)

export { app }
