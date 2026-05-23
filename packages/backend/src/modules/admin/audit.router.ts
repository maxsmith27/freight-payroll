import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateQuery } from '../../middleware/validate.middleware.js'
import { listAuditLogs } from './audit.service.js'
import type { AuditAction } from '@prisma/client'

export const auditRouter = Router()
auditRouter.use(authenticate)

const cq = (req: Request) => req.query.companyId as string

// Only Company Admins and Payroll Managers can view audit logs
const adminAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER')

const querySchema = z.object({
  companyId:  z.string(),
  employeeId: z.string().optional(),
  userId:     z.string().optional(),
  action:     z.string().optional(),
  entityType: z.string().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
  page:       z.coerce.number().default(1),
  pageSize:   z.coerce.number().default(50),
})

// GET /api/v1/admin/audit-logs?companyId=...&page=1&action=LEAVE_APPROVED&from=2025-07-01&to=2026-06-30
auditRouter.get('/', adminAccess, validateQuery(querySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, from, to, action, ...rest } = req.query as unknown as z.infer<typeof querySchema>

    const result = await listAuditLogs({
      companyId,
      ...rest,
      action:     action as AuditAction | undefined,
      from:       from ? new Date(from) : undefined,
      to:         to   ? new Date(to)   : undefined,
    })

    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})
