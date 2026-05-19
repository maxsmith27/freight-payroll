import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import * as service from './leave.service.js'

export const leaveRouter = Router()
leaveRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })
const cq = (req: Request) => req.query.companyId as string
const managerAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR')

leaveRouter.post('/requests', managerAccess, validateBody(service.leaveRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const request = await service.requestLeave(companyId, req.body)
    res.status(201).json({ success: true, data: request })
  } catch (err) { next(err) }
})

leaveRouter.get('/requests', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const filters = {
      employeeId: req.query.employeeId as string,
      status: req.query.status as string,
      page: Number(req.query.page ?? 1),
    }
    const result = await service.listLeaveRequests(companyId, filters)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

leaveRouter.post('/requests/:id/approve', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body)
    const request = await service.approveLeave(req.params.id, companyId, req.user!.id, notes)
    res.json({ success: true, data: request })
  } catch (err) { next(err) }
})

leaveRouter.post('/requests/:id/decline', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { notes } = z.object({ notes: z.string().min(1) }).parse(req.body)
    const request = await service.declineLeave(req.params.id, companyId, req.user!.id, notes)
    res.json({ success: true, data: request })
  } catch (err) { next(err) }
})

leaveRouter.get('/balances/:employeeId', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const balances = await service.getLeaveBalances(req.params.employeeId, companyId)
    res.json({ success: true, data: balances })
  } catch (err) { next(err) }
})
