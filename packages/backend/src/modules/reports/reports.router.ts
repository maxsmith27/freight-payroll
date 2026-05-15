import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.middleware.js'
import * as service from './reports.service.js'

export const reportsRouter = Router()
reportsRouter.use(authenticate)

const dateRangeQuery = z.object({
  companyId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
})

reportsRouter.get('/payroll-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, startDate, endDate } = dateRangeQuery.parse(req.query)
    const report = await service.getPayrollSummaryReport(companyId, new Date(startDate), new Date(endDate))
    res.json({ success: true, data: report })
  } catch (err) { next(err) }
})

reportsRouter.get('/employee-payroll/:employeeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, startDate, endDate } = dateRangeQuery.parse(req.query)
    const report = await service.getEmployeePayrollDetail(companyId, req.params.employeeId, new Date(startDate), new Date(endDate))
    res.json({ success: true, data: report })
  } catch (err) { next(err) }
})

reportsRouter.get('/super', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, startDate, endDate } = dateRangeQuery.parse(req.query)
    const report = await service.getSuperReport(companyId, new Date(startDate), new Date(endDate))
    res.json({ success: true, data: report })
  } catch (err) { next(err) }
})

reportsRouter.get('/leave-liability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
    const report = await service.getLeaveLiabilityReport(companyId)
    res.json({ success: true, data: report })
  } catch (err) { next(err) }
})

reportsRouter.get('/headcount', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
    const report = await service.getHeadcountReport(companyId)
    res.json({ success: true, data: report })
  } catch (err) { next(err) }
})
