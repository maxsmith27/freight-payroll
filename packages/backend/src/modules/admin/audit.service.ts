import prisma from '../../lib/prisma.js'
import type { AuditAction } from '@prisma/client'

export interface AuditLogFilters {
  companyId: string
  employeeId?: string
  userId?: string
  action?: AuditAction
  entityType?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export interface AuditLogEntry {
  id: string
  createdAt: string
  action: AuditAction
  entityType: string
  entityId: string
  newValues: unknown
  previousValues: unknown
  ipAddress: string | null
  userId: string | null
  userName: string | null
  userEmail: string | null
  employeeId: string | null
  employeeName: string | null
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function listAuditLogs(filters: AuditLogFilters): Promise<AuditLogPage> {
  const page     = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50))
  const skip     = (page - 1) * pageSize

  const where = {
    companyId:  filters.companyId,
    ...(filters.employeeId  ? { employeeId:  filters.employeeId }  : {}),
    ...(filters.userId      ? { userId:      filters.userId }      : {}),
    ...(filters.action      ? { action:      filters.action }      : {}),
    ...(filters.entityType  ? { entityType:  filters.entityType }  : {}),
    ...((filters.from || filters.to) ? {
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to   ? { lte: filters.to }   : {}),
      },
    } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  // Resolve user names — AuditLog has no Prisma relation to User, so batch separately
  const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as string[]
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const userMap = new Map(users.map(u => [u.id, u]))

  const data: AuditLogEntry[] = logs.map(log => {
    const user = log.userId ? userMap.get(log.userId) : undefined
    return {
      id:             log.id,
      createdAt:      log.createdAt.toISOString(),
      action:         log.action,
      entityType:     log.entityType,
      entityId:       log.entityId,
      newValues:      log.newValues,
      previousValues: log.previousValues,
      ipAddress:      log.ipAddress ?? null,
      userId:         log.userId ?? null,
      userName:       user ? `${user.firstName} ${user.lastName}` : null,
      userEmail:      user?.email ?? null,
      employeeId:     log.employeeId ?? null,
      employeeName:   log.employee
        ? `${log.employee.firstName} ${log.employee.lastName}`
        : null,
    }
  })

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
