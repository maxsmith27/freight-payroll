import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess, getDepotScope } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import * as service from './employees.service.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'
import prisma from '../../lib/prisma.js'

export const employeesRouter = Router()
employeesRouter.use(authenticate)

const cq = (req: Request) => req.query.companyId as string
const anyAccess    = requireCompanyAccess(cq)
const payrollAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER')
const adminAccess  = requireCompanyAccess(cq, 'COMPANY_ADMIN')

// ─── List employees ────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  companyId: z.string(),
  search: z.string().optional(),
  depotId: z.string().optional(),
  employmentType: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(50),
})

employeesRouter.get('/', anyAccess, validateQuery(listQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, ...filters } = req.query as unknown as z.infer<typeof listQuerySchema>
    const depotScope = getDepotScope(req, companyId)
    // Enforce depot scope: scoped users cannot query outside their assigned depot
    if (depotScope) filters.depotId = depotScope
    const result = await service.listEmployees(companyId, filters)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

// ─── Create employee ───────────────────────────────────────────────────────

const createQuerySchema = z.object({ companyId: z.string() })

employeesRouter.post('/', payrollAccess, validateBody(service.createEmployeeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const employee = await service.createEmployee(companyId, req.body, req.user!.id)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'Employee',
      entityId: employee.id,
      companyId,
      newValues: { employeeNumber: employee.employeeNumber, name: `${employee.firstName} ${employee.lastName}` },
    })
    res.status(201).json({ success: true, data: employee })
  } catch (err) { next(err) }
})

// ─── Get employee ───────────────────────────────────────────────────────────

employeesRouter.get('/:id', anyAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const employee = await service.getEmployee(req.params.id, companyId, depotScope)
    res.json({ success: true, data: employee })
  } catch (err) { next(err) }
})

// ─── Update employee ────────────────────────────────────────────────────────

employeesRouter.put('/:id', payrollAccess, validateBody(service.updateEmployeeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const employee = await service.updateEmployee(req.params.id, companyId, req.body, req.user!.id, depotScope)
    await writeAuditLog(req, {
      action: 'UPDATE',
      entityType: 'Employee',
      entityId: employee.id,
      companyId,
      newValues: req.body,
    })
    res.json({ success: true, data: employee })
  } catch (err) { next(err) }
})

// ─── Terminate employee ─────────────────────────────────────────────────────

const terminateSchema = z.object({
  endDate: z.string().datetime(),
  terminationReason: z.string().optional(),
})

employeesRouter.post('/:id/terminate', adminAccess, validateBody(terminateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const employee = await service.terminateEmployee(req.params.id, companyId, req.body, depotScope)
    await writeAuditLog(req, {
      action: 'UPDATE',
      entityType: 'Employee',
      entityId: employee.id,
      companyId,
      newValues: { status: 'TERMINATED', endDate: req.body.endDate },
    })
    res.json({ success: true, data: employee })
  } catch (err) { next(err) }
})

// ─── Pay rates ──────────────────────────────────────────────────────────────

employeesRouter.post('/:id/pay-rates', payrollAccess, validateBody(service.payRateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const rate = await service.addPayRate(req.params.id, companyId, req.body, req.user!.id, depotScope)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'PayRate',
      entityId: rate.id,
      companyId,
      employeeId: req.params.id,
      newValues: { payType: rate.payType, effectiveFrom: rate.effectiveFrom },
    })
    res.status(201).json({ success: true, data: rate })
  } catch (err) { next(err) }
})

// ─── Award classifications ──────────────────────────────────────────────────

employeesRouter.post('/:id/classifications', payrollAccess, validateBody(service.awardClassificationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const classification = await service.addAwardClassification(req.params.id, companyId, req.body, req.user!.id, depotScope)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'AwardClassification',
      entityId: classification.id,
      companyId,
      employeeId: req.params.id,
      newValues: { awardCode: classification.awardCode, classificationLevel: classification.classificationLevel, effectiveFrom: classification.effectiveFrom },
    })
    res.status(201).json({ success: true, data: classification })
  } catch (err) { next(err) }
})

// ─── Bank accounts ──────────────────────────────────────────────────────────

employeesRouter.get('/:id/bank-accounts', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const accounts = await service.getBankAccounts(req.params.id, companyId, depotScope)
    res.json({ success: true, data: accounts })
  } catch (err) { next(err) }
})

employeesRouter.post('/:id/bank-accounts', payrollAccess, validateBody(service.bankAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const account = await service.addBankAccount(req.params.id, companyId, req.body, depotScope)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'BankAccount',
      entityId: account.id,
      companyId,
      employeeId: req.params.id,
      // Deliberately omit BSB/account number from audit log values
      newValues: { accountName: account.accountName, isPrimary: account.isPrimary },
    })
    res.status(201).json({ success: true, data: account })
  } catch (err) { next(err) }
})

// ─── Emergency contacts ─────────────────────────────────────────────────────

const emergencyContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  phone: z.string().min(1),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  isPrimary: z.boolean().default(false),
})

employeesRouter.post('/:id/emergency-contacts', payrollAccess, validateBody(emergencyContactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const depotScope = getDepotScope(req, companyId)
    const contact = await service.addEmergencyContact(req.params.id, companyId, req.body, depotScope)
    res.status(201).json({ success: true, data: contact })
  } catch (err) { next(err) }
})

// ─── Import ─────────────────────────────────────────────────────────────────

// ─── Portal access ────────────────────────────────────────────────────────────

const portalAccessSchema = z.object({ password: z.string().min(8) })

employeesRouter.post('/:id/portal-access', adminAccess, validateBody(portalAccessSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const result = await service.grantPortalAccess(req.params.id, companyId, req.body.password)
    await writeAuditLog(req, {
      action: 'PORTAL_ACCESS_GRANTED',
      entityType: 'Employee',
      entityId: req.params.id,
      companyId,
      employeeId: req.params.id,
    })
    res.status(201).json({ success: true, data: result })
  } catch (err) { next(err) }
})

employeesRouter.delete('/:id/portal-access', adminAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    await service.revokePortalAccess(req.params.id, companyId)
    await writeAuditLog(req, {
      action: 'PORTAL_ACCESS_REVOKED',
      entityType: 'Employee',
      entityId: req.params.id,
      companyId,
      employeeId: req.params.id,
    })
    res.json({ success: true })
  } catch (err) { next(err) }
})

// ─── Award minimum rates ───────────────────────────────────────────────────

employeesRouter.get('/award-minimums', anyAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rates = await prisma.awardBaseRate.findMany({
      where: { effectiveTo: null },
      orderBy: [{ award: 'asc' }, { classificationLevel: 'asc' }],
    })
    res.json({ success: true, data: rates })
  } catch (err) { next(err) }
})

// ─── Import ────────────────────────────────────────────────────────────────

employeesRouter.post('/import', payrollAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const { rows } = z.object({ rows: z.array(z.any()) }).parse(req.body)
    const result = await service.importEmployees(companyId, rows, req.user!.id)
    await writeAuditLog(req, {
      action: 'CREATE',
      entityType: 'EmployeeImport',
      entityId: companyId,
      companyId,
      newValues: { rowCount: rows.length, created: result.created, errors: result.errors?.length ?? 0 },
    })
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})
