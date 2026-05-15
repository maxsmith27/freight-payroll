import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import * as service from './rostering.service.js'

export const rosteringRouter = Router()
rosteringRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })

rosteringRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const result = await service.listRosters(companyId, Number(req.query.page ?? 1))
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

rosteringRouter.post('/', validateBody(service.createRosterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const roster = await service.createRoster(companyId, req.body, req.user!.id)
    res.status(201).json({ success: true, data: roster })
  } catch (err) { next(err) }
})

rosteringRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const roster = await service.getRoster(req.params.id, companyId)
    res.json({ success: true, data: roster })
  } catch (err) { next(err) }
})

rosteringRouter.post('/:id/shifts', validateBody(service.createShiftSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const shift = await service.addShift(req.params.id, companyId, req.body)
    res.status(201).json({ success: true, data: shift })
  } catch (err) { next(err) }
})

rosteringRouter.put('/:id/shifts/:shiftId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const shift = await service.updateShift(req.params.shiftId, companyId, req.body)
    res.json({ success: true, data: shift })
  } catch (err) { next(err) }
})

rosteringRouter.delete('/:id/shifts/:shiftId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    await service.deleteShift(req.params.shiftId, companyId)
    res.json({ success: true })
  } catch (err) { next(err) }
})

rosteringRouter.post('/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const roster = await service.publishRoster(req.params.id, companyId, req.user!.id)
    res.json({ success: true, data: roster })
  } catch (err) { next(err) }
})

rosteringRouter.post('/copy', async (req: Request, res: Response, next: NextFunction) => {
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
