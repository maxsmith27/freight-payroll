import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { UnauthorizedError, ForbiddenError } from './error.middleware.js'
import type { JwtPayload, CompanyRole, GlobalRole } from '@freight-payroll/shared'

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export interface AuthenticatedUser {
  id: string
  email: string
  globalRole: GlobalRole
  organizationId: string
  companyAccess: Array<{
    companyId: string
    role: CompanyRole
    depotId?: string
  }>
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('No bearer token provided')
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload & {
      companyAccess?: AuthenticatedUser['companyAccess']
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      globalRole: payload.globalRole,
      organizationId: payload.organizationId,
      companyAccess: payload.companyAccess ?? [],
    }
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired')
    }
    throw new UnauthorizedError('Invalid token')
  }
}

export function requireGlobalRole(...roles: GlobalRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError()
    if (!roles.includes(req.user.globalRole)) {
      throw new ForbiddenError('Insufficient permissions')
    }
    next()
  }
}

export function requireCompanyAccess(
  getCompanyId: (req: Request) => string,
  ...roles: CompanyRole[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError()

    // Super admins bypass company-level checks
    if (req.user.globalRole === 'SUPER_ADMIN') {
      next()
      return
    }

    const companyId = getCompanyId(req)
    if (!companyId) throw new ForbiddenError('Company ID is required')
    const access = req.user.companyAccess.find(a => a.companyId === companyId)

    if (!access) {
      throw new ForbiddenError('No access to this company')
    }

    if (roles.length > 0 && !roles.includes(access.role)) {
      throw new ForbiddenError('Insufficient role for this company')
    }

    next()
  }
}

/**
 * Returns the depot the user is scoped to for a given company, or null if unrestricted.
 * COMPANY_ADMIN and PAYROLL_MANAGER are never depot-restricted even if depotId is set.
 */
export function getDepotScope(req: Request, companyId: string): string | null {
  if (!req.user) return null
  if (req.user.globalRole === 'SUPER_ADMIN') return null
  const access = req.user.companyAccess.find(a => a.companyId === companyId)
  if (!access) return null
  if (access.role === 'COMPANY_ADMIN' || access.role === 'PAYROLL_MANAGER') return null
  return access.depotId ?? null
}

/**
 * Check if the authenticated user has access to a specific company.
 */
export function getUserCompanyRole(
  user: AuthenticatedUser,
  companyId: string,
): CompanyRole | null {
  if (user.globalRole === 'SUPER_ADMIN') return 'COMPANY_ADMIN'
  return user.companyAccess.find(a => a.companyId === companyId)?.role ?? null
}

export function canManagePayroll(user: AuthenticatedUser, companyId: string): boolean {
  const role = getUserCompanyRole(user, companyId)
  return role === 'COMPANY_ADMIN' || role === 'PAYROLL_MANAGER'
}

export function canApproveTimesheets(user: AuthenticatedUser, companyId: string): boolean {
  const role = getUserCompanyRole(user, companyId)
  return (
    role === 'COMPANY_ADMIN' ||
    role === 'PAYROLL_MANAGER' ||
    role === 'DEPOT_MANAGER' ||
    role === 'SUPERVISOR'
  )
}
