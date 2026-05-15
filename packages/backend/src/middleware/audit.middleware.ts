import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import type { AuditAction } from '@prisma/client'

interface AuditParams {
  action: AuditAction
  entityType: string
  entityId: string
  previousValues?: unknown
  newValues?: unknown
  companyId?: string
  employeeId?: string
}

/**
 * Write an audit log entry.
 * Called directly from service methods, not as Express middleware.
 */
export async function writeAuditLog(
  req: Request,
  params: AuditParams,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: req.user?.organizationId,
        companyId: params.companyId,
        userId: req.user?.id,
        employeeId: params.employeeId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousValues: params.previousValues ? (params.previousValues as object) : undefined,
        newValues: params.newValues ? (params.newValues as object) : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })
  } catch (err) {
    // Audit log failures should not break the main request
    logger.error('Failed to write audit log', { error: err, params })
  }
}

/**
 * Express middleware to log all mutating requests.
 * For detailed entity-level audit, use writeAuditLog() from service methods.
 */
export function requestAuditLogger(req: Request, _res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    logger.info(`${req.method} ${req.path}`, {
      userId: req.user?.id,
      ip: req.ip,
    })
  }
  next()
}
