import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, requireCompanyAccess } from '../../middleware/auth.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { writeAuditLog } from '../../middleware/audit.middleware.js'
import * as service from './onboarding.service.js'

export const onboardingRouter = Router()

const cq = (req: Request) => req.query.companyId as string
const adminAccess = requireCompanyAccess(cq, 'COMPANY_ADMIN', 'PAYROLL_MANAGER')

// ─── Admin: send invite ───────────────────────────────────────────────────────

onboardingRouter.post(
  '/invite',
  authenticate,
  adminAccess,
  validateBody(service.inviteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const result = await service.sendInvite(companyId, req.user!.id, req.body)
      await writeAuditLog(req, {
        action: 'ONBOARDING_INVITED',
        entityType: 'EmployeeOnboarding',
        entityId: result.id,
        companyId,
        newValues: { inviteEmail: result.inviteEmail },
      })
      res.status(201).json({ success: true, data: result })
    } catch (err) { next(err) }
  },
)

// ─── Admin: list pending ──────────────────────────────────────────────────────

onboardingRouter.get(
  '/pending',
  authenticate,
  adminAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const data = await service.listPendingOnboardings(companyId)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// ─── Admin: activate employee ─────────────────────────────────────────────────

onboardingRouter.post(
  '/:id/activate',
  authenticate,
  adminAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const result = await service.activateOnboarding(req.params.id, companyId, req.user!.id)
      await writeAuditLog(req, {
        action: 'ONBOARDING_COMPLETED',
        entityType: 'EmployeeOnboarding',
        entityId: req.params.id,
        companyId,
        newValues: { employeeId: result.employeeId, employeeNumber: result.employeeNumber },
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
)

// ─── Admin: resend invite ─────────────────────────────────────────────────────

onboardingRouter.post(
  '/:id/resend',
  authenticate,
  adminAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const result = await service.resendInvite(req.params.id, companyId)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
)

// ─── Admin: cancel invite ─────────────────────────────────────────────────────

onboardingRouter.delete(
  '/:id',
  authenticate,
  adminAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = z.object({ companyId: z.string() }).parse(req.query)
      const result = await service.cancelInvite(req.params.id, companyId)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
)

// ─── Public: get onboarding by token (no auth) ────────────────────────────────

onboardingRouter.get(
  '/token/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.getOnboardingByToken(req.params.token)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
)

// ─── Public: save progress ────────────────────────────────────────────────────

onboardingRouter.put(
  '/token/:token',
  validateBody(service.onboardingDataSchema.partial()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.saveOnboardingProgress(req.params.token, req.body)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
)

// ─── Public: submit onboarding ────────────────────────────────────────────────

onboardingRouter.post(
  '/token/:token/submit',
  validateBody(service.onboardingDataSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.submitOnboarding(req.params.token, req.body)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
)
