import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import {
  getCompaniesForOrg,
  getCompany,
  createCompany,
  updateCompany,
  createDepot,
  getDepots,
  seedDefaultAllowances,
  createCompanySchema,
  createDepotSchema,
} from './companies.service.js'

export const companiesRouter = Router()
companiesRouter.use(authenticate)

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

companiesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await getCompany(req.params.id, req.user!.organizationId)
    res.json({ success: true, data: company })
  } catch (err) { next(err) }
})

companiesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await updateCompany(req.params.id, req.user!.organizationId, req.body)
    res.json({ success: true, data: company })
  } catch (err) { next(err) }
})

companiesRouter.get('/:id/depots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depots = await getDepots(req.params.id)
    res.json({ success: true, data: depots })
  } catch (err) { next(err) }
})

companiesRouter.post('/:id/depots', validateBody(createDepotSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depot = await createDepot(req.params.id, req.user!.organizationId, req.body)
    res.status(201).json({ success: true, data: depot })
  } catch (err) { next(err) }
})
