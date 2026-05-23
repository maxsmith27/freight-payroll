import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess, getDepotScope } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'
import * as service from './timeAttendance.service.js'

export const timeAttendanceRouter = Router()
timeAttendanceRouter.use(authenticate)

const companyQuery = z.object({ companyId: z.string() })
const cq = (req: Request) => req.query.companyId as string
const managerAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR')

timeAttendanceRouter.post('/clock-in', managerAccess, validateBody(service.clockInSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const entry = await service.clockIn(companyId, req.body)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'TimeEntry',
      entityId: entry.id,
      companyId,
      employeeId: entry.employeeId,
      newValues: { clockIn: entry.clockIn },
    })
    res.status(201).json({ success: true, data: entry })
  } catch (err) { next(err) }
})

timeAttendanceRouter.post('/entries/:id/clock-out', managerAccess, validateBody(service.clockOutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const entry = await service.clockOut(companyId, req.params.id, req.body)
    await writeAuditLog(req, {
      action: 'UPDATE',
      entityType: 'TimeEntry',
      entityId: entry.id,
      companyId,
      employeeId: entry.employeeId,
      newValues: { clockOut: entry.clockOut },
    })
    res.json({ success: true, data: entry })
  } catch (err) { next(err) }
})

timeAttendanceRouter.post('/entries/manual', managerAccess, validateBody(service.manualEntrySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const entry = await service.addManualEntry(companyId, req.body, req.user!.id)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'TimeEntry',
      entityId: entry.id,
      companyId,
      employeeId: entry.employeeId,
      newValues: { clockIn: entry.clockIn, clockOut: entry.clockOut, isManual: true },
    })
    res.status(201).json({ success: true, data: entry })
  } catch (err) { next(err) }
})

const listQuery = z.object({
  companyId: z.string(),
  employeeId: z.string().optional(),
  depotId: z.string().optional(),
  status: z.string().optional(),
  weekStartDate: z.string().optional(),
  page: z.coerce.number().default(1),
})

timeAttendanceRouter.get('/timesheets', managerAccess, validateQuery(listQuery), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, ...filters } = req.query as unknown as z.infer<typeof listQuery>
    const depotScope = getDepotScope(req, companyId)
    if (depotScope) filters.depotId = depotScope
    const result = await service.listTimesheets(companyId, filters)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

timeAttendanceRouter.post('/timesheets/:id/submit', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const ts = await service.submitTimesheet(req.params.id, companyId, req.user!.id)
    await writeAuditLog(req, {
      action: 'UPDATE',
      entityType: 'Timesheet',
      entityId: ts.id,
      companyId,
      newValues: { status: 'SUBMITTED' },
    })
    res.json({ success: true, data: ts })
  } catch (err) { next(err) }
})

timeAttendanceRouter.post('/timesheets/:id/approve', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body)
    const depotScope = getDepotScope(req, companyId)
    const ts = await service.approveTimesheet(req.params.id, companyId, req.user!.id, notes, depotScope)
    await writeAuditLog(req, {
      action: 'TIMESHEET_APPROVED',
      entityType: 'Timesheet',
      entityId: ts.id,
      companyId,
      newValues: { status: 'APPROVED', notes },
    })
    res.json({ success: true, data: ts })
  } catch (err) { next(err) }
})

timeAttendanceRouter.post('/timesheets/:id/reject', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { notes } = z.object({ notes: z.string().min(1) }).parse(req.body)
    const depotScope = getDepotScope(req, companyId)
    const ts = await service.rejectTimesheet(req.params.id, companyId, req.user!.id, notes, depotScope)
    await writeAuditLog(req, {
      action: 'UPDATE',
      entityType: 'Timesheet',
      entityId: ts.id,
      companyId,
      newValues: { status: 'REJECTED', notes },
    })
    res.json({ success: true, data: ts })
  } catch (err) { next(err) }
})

timeAttendanceRouter.get('/exceptions', managerAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = companyQuery.parse(req.query)
    const { weekStartDate } = z.object({ weekStartDate: z.string() }).parse(req.query)
    const result = await service.getTimesheetExceptions(companyId, new Date(weekStartDate))
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})
