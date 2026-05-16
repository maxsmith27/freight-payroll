import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import * as service from './employees.service.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'

export const employeesRouter = Router()
employeesRouter.use(authenticate)

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

employeesRouter.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, ...filters } = req.query as unknown as z.infer<typeof listQuerySchema>
    const result = await service.listEmployees(companyId, filters)
    res.json({ success: true, ...result })
  } catch (err) { next(err) }
})

// ─── Create employee ───────────────────────────────────────────────────────

const createQuerySchema = z.object({ companyId: z.string() })

employeesRouter.post('/', validateBody(service.createEmployeeSchema), async (req: Request, res: Response, next: NextFunction) => {
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

employeesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const employee = await service.getEmployee(req.params.id, companyId)
    res.json({ success: true, data: employee })
  } catch (err) { next(err) }
})

// ─── Update employee ────────────────────────────────────────────────────────

employeesRouter.put('/:id', validateBody(service.updateEmployeeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const employee = await service.updateEmployee(req.params.id, companyId, req.body, req.user!.id)
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

employeesRouter.post('/:id/terminate', validateBody(terminateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const employee = await service.terminateEmployee(req.params.id, companyId, req.body)
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

employeesRouter.post('/:id/pay-rates', validateBody(service.payRateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const rate = await service.addPayRate(req.params.id, companyId, req.body, req.user!.id)
    res.status(201).json({ success: true, data: rate })
  } catch (err) { next(err) }
})

// ─── Award classifications ──────────────────────────────────────────────────

employeesRouter.post('/:id/classifications', validateBody(service.awardClassificationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const classification = await service.addAwardClassification(req.params.id, companyId, req.body, req.user!.id)
    res.status(201).json({ success: true, data: classification })
  } catch (err) { next(err) }
})

// ─── Bank accounts ──────────────────────────────────────────────────────────

employeesRouter.get('/:id/bank-accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const accounts = await service.getBankAccounts(req.params.id, companyId)
    res.json({ success: true, data: accounts })
  } catch (err) { next(err) }
})

employeesRouter.post('/:id/bank-accounts', validateBody(service.bankAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const account = await service.addBankAccount(req.params.id, companyId, req.body)
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

employeesRouter.post('/:id/emergency-contacts', validateBody(emergencyContactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const contact = await service.addEmergencyContact(req.params.id, companyId, req.body)
    res.status(201).json({ success: true, data: contact })
  } catch (err) { next(err) }
})

// ─── Import ─────────────────────────────────────────────────────────────────

employeesRouter.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = createQuerySchema.parse(req.query)
    const { rows } = z.object({ rows: z.array(z.any()) }).parse(req.body)
    const result = await service.importEmployees(companyId, rows, req.user!.id)
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})
