import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import * as service from './payroll.service.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'
import fs from 'fs'

export const payrollRouter = Router()
payrollRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })
const cq = (req: Request) => req.query.companyId as string
const payrollAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER')

// ─── List pay runs ──────────────────────────────────────────────────────────

payrollRouter.get('/', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const page = Number(req.query.page ?? 1)
    const result = await service.listPayRuns(companyId, page)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

// ─── Create pay run ─────────────────────────────────────────────────────────

payrollRouter.post('/', payrollAccess, validateBody(service.createPayRunSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const payRun = await service.createPayRun(companyId, req.body, req.user!.id)
    await writeAuditLog(req, {
      action: 'PAY_RUN_CREATED',
      entityType: 'PayRun',
      entityId: payRun.id,
      companyId,
    })
    res.status(201).json({ success: true, data: payRun })
  } catch (err) { next(err) }
})

// ─── Get pay run ────────────────────────────────────────────────────────────

payrollRouter.get('/:id', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const payRun = await service.getPayRun(req.params.id, companyId)
    res.json({ success: true, data: payRun })
  } catch (err) { next(err) }
})

// ─── Finalise pay run ────────────────────────────────────────────────────────

payrollRouter.post('/:id/finalise', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const payRun = await service.finalisePayRun(req.params.id, companyId, req.user!.id)
    await writeAuditLog(req, {
      action: 'PAY_RUN_FINALISED',
      entityType: 'PayRun',
      entityId: payRun.id,
      companyId,
    })
    // Auto-generate payslips after finalisation
    service.generatePayslips(payRun.id, companyId).catch(err => {
      console.error('Payslip generation failed:', err)
    })
    res.json({ success: true, data: payRun })
  } catch (err) { next(err) }
})

// ─── Generate ABA file ────────────────────────────────────────────────────────

payrollRouter.post('/:id/aba', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const filePath = await service.generateABA(req.params.id, companyId)
    res.json({ success: true, data: { filePath } })
  } catch (err) { next(err) }
})

// ─── Download ABA file ────────────────────────────────────────────────────────

payrollRouter.get('/:id/aba/download', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const payRun = await service.getPayRun(req.params.id, companyId)
    if (!payRun.abaFileKey) {
      res.status(404).json({ success: false, error: 'ABA file not yet generated' })
      return
    }
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${req.params.id}.aba"`)
    fs.createReadStream(payRun.abaFileKey).pipe(res)
  } catch (err) { next(err) }
})

// ─── STP payload ─────────────────────────────────────────────────────────────

payrollRouter.get('/:id/stp', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const payload = await service.generateSTPPayload(req.params.id, companyId)
    res.json({ success: true, data: payload })
  } catch (err) { next(err) }
})

// ─── Download payslip ─────────────────────────────────────────────────────────

payrollRouter.get('/:id/payslip/:employeeId', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const payRun = await service.getPayRun(req.params.id, companyId)
    const item = payRun.items.find(i => i.employeeId === req.params.employeeId)
    if (!item?.payslipFileKey) {
      res.status(404).json({ success: false, error: 'Payslip not yet generated' })
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="payslip.pdf"`)
    fs.createReadStream(item.payslipFileKey).pipe(res)
  } catch (err) { next(err) }
})
