import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess, getDepotScope } from '../../middleware/auth.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import * as service from './rostering.service.js'

export const rosteringRouter = Router()
rosteringRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })
const cq = (req: Request) => req.query.companyId as string
const managerAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR')
const supervisorAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER')

rosteringRouter.get('/', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const result = await service.listRosters(companyId, Number(req.query.page ?? 1), depotScope)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

rosteringRouter.post('/', supervisorAccess, validateBody(service.createRosterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const roster = await service.createRoster(companyId, req.body, req.user!.id)
    res.status(201).json({ success: true, data: roster })
  } catch (err) { next(err) }
})

rosteringRouter.get('/:id', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const roster = await service.getRoster(req.params.id, companyId)
    res.json({ success: true, data: roster })
  } catch (err) { next(err) }
})

rosteringRouter.post('/:id/shifts', supervisorAccess, validateBody(service.createShiftSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const shift = await service.addShift(req.params.id, companyId, req.body)
    res.status(201).json({ success: true, data: shift })
  } catch (err) { next(err) }
})

rosteringRouter.put('/:id/shifts/:shiftId', supervisorAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const shift = await service.updateShift(req.params.shiftId, companyId, req.body)
    res.json({ success: true, data: shift })
  } catch (err) { next(err) }
})

rosteringRouter.delete('/:id/shifts/:shiftId', supervisorAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    await service.deleteShift(req.params.shiftId, companyId)
    res.json({ success: true })
  } catch (err) { next(err) }
})

rosteringRouter.post('/:id/publish', supervisorAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const roster = await service.publishRoster(req.params.id, companyId, req.user!.id)
    res.json({ success: true, data: roster })
  } catch (err) { next(err) }
})

rosteringRouter.post('/copy', supervisorAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { fromWeekStart, toWeekStart } = z.object({
      fromWeekStart: z.string(),
      toWeekStart: z.string(),
    }).parse(req.body)
    const roster = await service.copyRosterFromPreviousWeek(
      companyId,
      new Date(fromWeekStart),
      new Date(toWeekStart),
      req.user!.id,
    )
    res.status(201).json({ success: true, data: roster })
  } catch (err) { next(err) }
})
