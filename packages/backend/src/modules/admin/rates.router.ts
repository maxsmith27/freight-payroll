import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware.js'
import { requireGlobalRole } from '../../middleware/auth.middleware.js'
import { verifyRates, markVerified } from './rates.service.js'

export const ratesRouter = Router()

ratesRouter.use(authenticate)

// GET /api/v1/admin/rates/verify?fy=2025-26
ratesRouter.get('/verify', requireGlobalRole('SUPER_ADMIN', 'ORG_USER'), async (req, res, next) => {
  try {
    const fy = (req.query.fy as string) ?? '2025-26'
    const result = await verifyRates(fy)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/rates/verify  — mark current FY as verified
ratesRouter.post('/verify', requireGlobalRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { financialYear = '2025-26' } = req.body as { financialYear?: string }
    const email = req.user!.email
    await markVerified(financialYear, email)
    const result = await verifyRates(financialYear)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})
