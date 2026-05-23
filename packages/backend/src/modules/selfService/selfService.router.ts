import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import * as service from './selfService.service.js'
import { AppError } from '../../middleware/error.middleware.js'
import prisma from '../../lib/prisma.js'

export const selfServiceRouter = Router()
selfServiceRouter.use(authenticate)

const cq = (req: Request) => req.query.companyId as string
const managerAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR')

// Helper: resolve employeeId from the authenticated user's linked employee record
async function resolveEmployee(req: Request) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { employeeId: true },
  })
  if (!user?.employeeId) {
    throw new AppError(403, 'No employee profile linked to this account')
  }
  return user.employeeId
}

// ─── Profile ─────────────────────────────────────────────────────────────────

selfServiceRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getMyProfile(req.user!.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// ─── KM Logs ─────────────────────────────────────────────────────────────────

const kmListQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(50),
})

selfServiceRouter.get('/km-logs', validateQuery(kmListQuery), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const { page, pageSize } = req.query as unknown as z.infer<typeof kmListQuery>
    const result = await service.listMyKmLogs(employeeId, page, pageSize)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/km-logs', validateBody(service.kmLogSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.createKmLog(employeeId, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.put('/km-logs/:id', validateBody(service.kmLogSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.updateKmLog(req.params.id, employeeId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/km-logs/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.submitKmLog(req.params.id, employeeId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.delete('/km-logs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    await service.deleteKmLog(req.params.id, employeeId)
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── KM Log management (managers) ────────────────────────────────────────────

const manageKmQuery = z.object({
  companyId: z.string(),
  status: z.string().optional(),
  employeeId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(50),
})

selfServiceRouter.get('/km-logs/manage', managerAccess, validateQuery(manageKmQuery), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, page, pageSize, ...filters } = req.query as unknown as z.infer<typeof manageKmQuery>
    const result = await service.listCompanyKmLogs(companyId, filters, page, pageSize)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/km-logs/:id/approve', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
    const data = await service.approveKmLog(req.params.id, companyId, req.user!.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/km-logs/:id/reject', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body)
    const data = await service.rejectKmLog(req.params.id, companyId, reason)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// ─── Timesheets ───────────────────────────────────────────────────────────────

const tsListQuery = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
})

selfServiceRouter.get('/timesheets', validateQuery(tsListQuery), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const { page, pageSize } = req.query as unknown as z.infer<typeof tsListQuery>
    const result = await service.listMyTimesheets(employeeId, page, pageSize)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/timesheets', validateBody(service.timesheetSelfEntrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.upsertMyTimesheet(employeeId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/timesheets/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.submitMyTimesheet(req.params.id, employeeId, req.user!.id)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// ─── Payslips ────────────────────────────────────────────────────────────────

selfServiceRouter.get('/payslips', validateQuery(tsListQuery), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const { page, pageSize } = req.query as unknown as z.infer<typeof tsListQuery>
    const result = await service.listMyPayslips(employeeId, page, pageSize)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

// ─── Leave ────────────────────────────────────────────────────────────────────

selfServiceRouter.get('/leave-balances', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.getMyLeaveBalances(employeeId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.get('/leave-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.listMyLeaveRequests(employeeId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/leave-requests', validateBody(service.leaveRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.submitLeaveRequest(employeeId, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.delete('/leave-requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.cancelMyLeaveRequest(req.params.id, employeeId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// ─── Profile update ───────────────────────────────────────────────────────────

selfServiceRouter.put('/profile', validateBody(service.updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.updateMyProfile(req.user!.id, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

// ─── Bank accounts ────────────────────────────────────────────────────────────

selfServiceRouter.get('/bank-accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.getMyBankAccounts(employeeId)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.post('/bank-accounts', validateBody(service.bankAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.addMyBankAccount(employeeId, req.body)
    res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.put('/bank-accounts/:id', validateBody(service.bankAccountSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    const data = await service.updateMyBankAccount(req.params.id, employeeId, req.body)
    res.json({ success: true, data })
  } catch (err) { next(err) }
})

selfServiceRouter.delete('/bank-accounts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = await resolveEmployee(req)
    await service.deleteMyBankAccount(req.params.id, employeeId)
    res.json({ success: true })
  } catch (err) { next(err) }
})
