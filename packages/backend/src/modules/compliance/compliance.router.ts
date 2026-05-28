import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'
import * as service from './compliance.service.js'

// Multer: memory storage, 10 MB limit, PDFs and images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

export const complianceRouter = Router()
complianceRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })
const employeeParams = z.object({ employeeId: z.string() })
const cq = (req: Request) => req.query.companyId as string
const managerAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR')
const payrollAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER')

// ─── Expiry dashboard ────────────────────────────────────────────────────────

complianceRouter.get('/expiry-alerts', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const daysAhead = Number(req.query.daysAhead ?? 90)
    const alerts = await service.getExpiryAlerts(companyId, daysAhead)
    res.json({ success: true, data: alerts })
  } catch (err) { next(err) }
})

// ─── Manual alert trigger (also called by daily scheduler) ──────────────────

complianceRouter.post('/send-expiry-alerts', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const result = await service.sendExpiryAlertEmails(companyId)
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

// ─── Driver licences ─────────────────────────────────────────────────────────

complianceRouter.post('/employees/:employeeId/licences', payrollAccess, validateBody(service.licenceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { employeeId } = employeeParams.parse(req.params)
    const licence = await service.addLicence(employeeId, companyId, req.body)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'DriverLicence',
      entityId: licence.id,
      companyId,
      employeeId,
      newValues: { licenceClasses: licence.licenceClasses, expiryDate: licence.expiryDate },
    })
    res.status(201).json({ success: true, data: licence })
  } catch (err) { next(err) }
})

// ─── Accreditations ───────────────────────────────────────────────────────────

complianceRouter.post('/employees/:employeeId/accreditations', payrollAccess, validateBody(service.accreditationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { employeeId } = employeeParams.parse(req.params)
    const accreditation = await service.addAccreditation(employeeId, companyId, req.body)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'Accreditation',
      entityId: accreditation.id,
      companyId,
      employeeId,
      newValues: { accreditationType: accreditation.accreditationType, expiryDate: accreditation.expiryDate },
    })
    res.status(201).json({ success: true, data: accreditation })
  } catch (err) { next(err) }
})

// ─── Medical certificates ─────────────────────────────────────────────────────

complianceRouter.post('/employees/:employeeId/medicals', payrollAccess, validateBody(service.medicalCertSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { employeeId } = employeeParams.parse(req.params)
    const cert = await service.addMedicalCert(employeeId, companyId, req.body)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'MedicalCert',
      entityId: cert.id,
      companyId,
      employeeId,
      newValues: { certType: cert.certType, expiryDate: cert.expiryDate },
    })
    res.status(201).json({ success: true, data: cert })
  } catch (err) { next(err) }
})

// ─── Document upload & retrieval ─────────────────────────────────────────────
//
// POST /compliance/documents/:docType/:docId  — attach or replace a file
// GET  /compliance/documents/:docType/:docId  — get a signed/local URL to view

const docTypeSchema = z.enum(['licence', 'accreditation', 'medical'])

complianceRouter.post(
  '/documents/:docType/:docId',
  payrollAccess,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const docType = docTypeSchema.parse(req.params.docType)
      const { docId } = req.params

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file provided. Accepted: PDF, JPEG, PNG, WEBP (max 10 MB).' })
        return
      }

      const key = await service.attachComplianceDocument(docType, docId, companyId, req.file)
      await writeAuditLog(req, {
        action: 'UPDATE',
        entityType: docType === 'licence' ? 'DriverLicence' : docType === 'accreditation' ? 'Accreditation' : 'MedicalCert',
        entityId: docId,
        companyId,
        newValues: { documentKey: key },
      })
      res.json({ success: true, data: { key } })
    } catch (err) { next(err) }
  },
)

complianceRouter.get(
  '/documents/:docType/:docId',
  payrollAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const docType = docTypeSchema.parse(req.params.docType)
      const { docId } = req.params
      const url = await service.getComplianceDocumentUrl(docType, docId, companyId)
      res.json({ success: true, data: { url } })
    } catch (err) { next(err) }
  },
)

// ─── Fatigue management ───────────────────────────────────────────────────────

complianceRouter.post('/fatigue', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const record = await service.recordFatigueEntry(companyId, req.body)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'FatigueRecord',
      entityId: record.id,
      companyId,
      employeeId: record.employeeId,
      newValues: { workMinutes: record.workMinutes, recordDate: record.recordDate, isCompliant: record.isCompliant },
    })
    res.status(201).json({ success: true, data: record })
  } catch (err) { next(err) }
})

complianceRouter.get('/fatigue/report', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
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
