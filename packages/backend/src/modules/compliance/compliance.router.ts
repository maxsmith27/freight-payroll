import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import * as service from './compliance.service.js'

export const complianceRouter = Router()
complianceRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })
const employeeParams = z.object({ employeeId: z.string() })

// ─── Expiry dashboard ────────────────────────────────────────────────────────

complianceRouter.get('/expiry-alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const daysAhead = Number(req.query.daysAhead ?? 90)
    const alerts = await service.getExpiryAlerts(companyId, daysAhead)
    res.json({ success: true, data: alerts })
  } catch (err) { next(err) }
})

// ─── Driver licences ─────────────────────────────────────────────────────────

complianceRouter.post('/employees/:employeeId/licences', validateBody(service.licenceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { employeeId } = employeeParams.parse(req.params)
    const licence = await service.addLicence(employeeId, companyId, req.body)
    res.status(201).json({ success: true, data: licence })
  } catch (err) { next(err) }
})

// ─── Accreditations ───────────────────────────────────────────────────────────

complianceRouter.post('/employees/:employeeId/accreditations', validateBody(service.accreditationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { employeeId } = employeeParams.parse(req.params)
    const accreditation = await service.addAccreditation(employeeId, companyId, req.body)
    res.status(201).json({ success: true, data: accreditation })
  } catch (err) { next(err) }
})

// ─── Medical certificates ─────────────────────────────────────────────────────

complianceRouter.post('/employees/:employeeId/medicals', validateBody(service.medicalCertSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { employeeId } = employeeParams.parse(req.params)
    const cert = await service.addMedicalCert(employeeId, companyId, req.body)
    res.status(201).json({ success: true, data: cert })
  } catch (err) { next(err) }
})

// ─── Fatigue management ───────────────────────────────────────────────────────

complianceRouter.post('/fatigue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const record = await service.recordFatigueEntry(companyId, req.body)
    res.status(201).json({ success: true, data: record })
  } catch (err) { next(err) }
})

complianceRouter.get('/fatigue/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { startDate, endDate } = z.object({
      startDate: z.string(),
      endDate: z.string(),
    }).parse(req.query)
    const report = await service.getFatigueReport(companyId, new Date(startDate), new Date(endDate))
    res.json({ success: true, data: report })
  } catch (err) { next(err) }
})
