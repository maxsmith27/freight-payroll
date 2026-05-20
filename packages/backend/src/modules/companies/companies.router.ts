import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import {
  getCompaniesForOrg,
  getCompany,
  createCompany,
  updateCompany,
  createDepot,
  getDepots,
  getCompanyUsers,
  updateUserAccess,
  updateUserAccessSchema,
  seedDefaultAllowances,
  createCompanySchema,
  createDepotSchema,
} from './companies.service.js'
import * as employeeService from '../employees/employees.service.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'

export const companiesRouter = Router()
companiesRouter.use(authenticate)

// companyId lives in req.params.id for all /:id routes
const cp = (req: Request) => req.params.id

companiesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await getCompaniesForOrg(req.user!.organizationId)
    res.json({ success: true, data: companies })
  } catch (err) { next(err) }
})

companiesRouter.post('/', validateBody(createCompanySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await createCompany(req.user!.organizationId, req.body)
    await seedDefaultAllowances(company.id)
    res.status(201).json({ success: true, data: company })
  } catch (err) { next(err) }
})

companiesRouter.get('/:id', requireCompanyAccess(cp), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await getCompany(req.params.id, req.user!.organizationId)
    res.json({ success: true, data: company })
  } catch (err) { next(err) }
})

companiesRouter.put('/:id', requireCompanyAccess(cp, 'COMPANY_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await updateCompany(req.params.id, req.user!.organizationId, req.body)
    res.json({ success: true, data: company })
  } catch (err) { next(err) }
})

companiesRouter.get('/:id/depots', requireCompanyAccess(cp), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depots = await getDepots(req.params.id)
    res.json({ success: true, data: depots })
  } catch (err) { next(err) }
})

companiesRouter.post('/:id/depots', requireCompanyAccess(cp, 'COMPANY_ADMIN'), validateBody(createDepotSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depot = await createDepot(req.params.id, req.user!.organizationId, req.body)
    res.status(201).json({ success: true, data: depot })
  } catch (err) { next(err) }
})

// ─── User access management ──────────────────────────────────────────────────

companiesRouter.get('/:id/users', requireCompanyAccess(cp, 'COMPANY_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getCompanyUsers(req.params.id)
    res.json({ success: true, data: users })
  } catch (err) { next(err) }
})

companiesRouter.patch('/:id/users/:userId/access', requireCompanyAccess(cp, 'COMPANY_ADMIN'), validateBody(updateUserAccessSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access = await updateUserAccess(req.params.id, req.params.userId, req.body)
    res.json({ success: true, data: access })
  } catch (err) { next(err) }
})

// ─── Employee sub-routes (used by frontend) ──────────────────────────────────

const listEmployeesQuery = z.object({
  search: z.string().optional(),
  depotId: z.string().optional(),
  employmentType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(50),
})

companiesRouter.get('/:id/employees', requireCompanyAccess(cp, 'COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR'), validateQuery(listEmployeesQuery), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = req.query as unknown as z.infer<typeof listEmployeesQuery>
    const result = await employeeService.listEmployees(req.params.id, filters)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

companiesRouter.post('/:id/employees', requireCompanyAccess(cp, 'COMPANY_ADMIN', 'PAYROLL_MANAGER'), validateBody(employeeService.createEmployeeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeeService.createEmployee(req.params.id, req.body, req.user!.id)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'Employee',
      entityId: employee.id,
      companyId: req.params.id,
      newValues: { employeeNumber: employee.employeeNumber, name: `${employee.firstName} ${employee.lastName}` },
    })
    res.status(201).json({ success: true, data: employee })
  } catch (err) { next(err) }
})
