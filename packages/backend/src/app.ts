import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { config } from './config/index.js'
import { errorHandler } from './middleware/error.middleware.js'
import { requestAuditLogger } from './middleware/audit.middleware.js'
import { logger } from './lib/logger.js'

// Route modules
import { authRouter } from './modules/auth/auth.router.js'
import { employeesRouter } from './modules/employees/employees.router.js'
import { companiesRouter } from './modules/companies/companies.router.js'
import { payrollRouter } from './modules/payroll/payroll.router.js'
import { timeAttendanceRouter } from './modules/timeAttendance/timeAttendance.router.js'
import { leaveRouter } from './modules/leave/leave.router.js'
import { rosteringRouter } from './modules/rostering/rostering.router.js'
import { complianceRouter } from './modules/compliance/compliance.router.js'
import { reportsRouter } from './modules/reports/reports.router.js'

const app = express()

// ─── Security ──────────────────────────────────────────────────────────────

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const allowed = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        || origin.endsWith('.vercel.app')
        || origin === config.FRONTEND_URL
      callback(allowed ? null : new Error('Not allowed by CORS'), allowed)
    },
    credentials: true,
  }),
)

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
app.use('/api/v1/companies', requestAuditLogger, companiesRouter)
app.use('/api/v1/employees', requestAuditLogger, employeesRouter)
app.use('/api/v1/payroll', requestAuditLogger, payrollRouter)
app.use('/api/v1/time-attendance', requestAuditLogger, timeAttendanceRouter)
app.use('/api/v1/leave', requestAuditLogger, leaveRouter)
app.use('/api/v1/roster', requestAuditLogger, rosteringRouter)
app.use('/api/v1/compliance', requestAuditLogger, complianceRouter)
app.use('/api/v1/reports', reportsRouter)

// ─── 404 handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ─── Error handler ──────────────────────────────────────────────────────────

app.use(errorHandler)

export { app }
