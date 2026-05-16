import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'

// ─── Schemas ────────────────────────────────────────────────────────────────

export const kmLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kilometres: z.number().positive(),
  originAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
  mapsRouteDescription: z.string().optional(),
  vehicleRego: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
})

export const timesheetSelfEntrySchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(
    z.object({
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      clockIn: z.string().datetime(),
      clockOut: z.string().datetime(),
      breakMinutes: z.number().min(0).default(0),
      notes: z.string().optional(),
    }),
  ),
})

// ─── Employee profile ────────────────────────────────────────────────────────

export async function getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      employeeId: true,
      employee: {
        include: {
          payRates: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
          leaveBalances: true,
          awardClassifications: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
          depot: { select: { name: true } },
          company: { select: { id: true, name: true, abn: true } },
          bankAccounts: { select: { id: true, accountName: true, bsb: true, accountNumber: true, isPrimary: true } },
        },
      },
    },
  })

  if (!user?.employee) throw new NotFoundError('Employee profile')
  return user.employee
}

// ─── KM Logs ─────────────────────────────────────────────────────────────────

export async function listMyKmLogs(employeeId: string, page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize
  const [data, total] = await Promise.all([
    prisma.kmLog.findMany({
      where: { employeeId },
      orderBy: { logDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.kmLog.count({ where: { employeeId } }),
  ])
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function createKmLog(
  employeeId: string,
  data: z.infer<typeof kmLogSchema>,
) {
  return prisma.kmLog.create({
    data: {
      employeeId,
      logDate: new Date(data.logDate),
      kilometres: data.kilometres,
      originAddress: data.originAddress,
      destinationAddress: data.destinationAddress,
      mapsRouteDescription: data.mapsRouteDescription,
      vehicleRego: data.vehicleRego,
      purpose: data.purpose,
      notes: data.notes,
      status: 'DRAFT',
    },
  })
}

export async function updateKmLog(
  id: string,
  employeeId: string,
  data: z.infer<typeof kmLogSchema>,
) {
  const log = await prisma.kmLog.findFirst({ where: { id, employeeId } })
  if (!log) throw new NotFoundError('KM log')
  if (log.status !== 'DRAFT') throw new AppError(400, 'Only draft km logs can be edited')

  return prisma.kmLog.update({
    where: { id },
    data: {
      logDate: new Date(data.logDate),
      kilometres: data.kilometres,
      originAddress: data.originAddress,
      destinationAddress: data.destinationAddress,
      mapsRouteDescription: data.mapsRouteDescription,
      vehicleRego: data.vehicleRego,
      purpose: data.purpose,
      notes: data.notes,
    },
  })
}

export async function submitKmLog(id: string, employeeId: string) {
  const log = await prisma.kmLog.findFirst({ where: { id, employeeId } })
  if (!log) throw new NotFoundError('KM log')
  if (log.status !== 'DRAFT') throw new AppError(400, 'Log already submitted')

  return prisma.kmLog.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })
}

export async function deleteKmLog(id: string, employeeId: string) {
  const log = await prisma.kmLog.findFirst({ where: { id, employeeId } })
  if (!log) throw new NotFoundError('KM log')
  if (log.status !== 'DRAFT') throw new AppError(400, 'Only draft km logs can be deleted')

  return prisma.kmLog.delete({ where: { id } })
}

// ─── KM Log management (for managers) ─────────────────────────────────────────

export async function listCompanyKmLogs(
  companyId: string,
  filters: { status?: string; employeeId?: string; from?: string; to?: string },
  page = 1,
  pageSize = 50,
) {
  const skip = (page - 1) * pageSize
  const where = {
    employee: { companyId },
    ...(filters.status && { status: filters.status as any }),
    ...(filters.employeeId && { employeeId: filters.employeeId }),
    ...(filters.from || filters.to
      ? {
          logDate: {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to) }),
          },
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.kmLog.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { logDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.kmLog.count({ where }),
  ])

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function approveKmLog(id: string, companyId: string, approverId: string) {
  const log = await prisma.kmLog.findFirst({
    where: { id, employee: { companyId } },
  })
  if (!log) throw new NotFoundError('KM log')
  if (log.status !== 'SUBMITTED') throw new AppError(400, 'Log must be submitted before approving')

  return prisma.kmLog.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: approverId },
  })
}

export async function rejectKmLog(id: string, companyId: string, reason: string) {
  const log = await prisma.kmLog.findFirst({
    where: { id, employee: { companyId } },
  })
  if (!log) throw new NotFoundError('KM log')
  if (log.status !== 'SUBMITTED') throw new AppError(400, 'Log must be submitted before rejecting')

  return prisma.kmLog.update({
    where: { id },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
  })
}

// ─── Timesheets ───────────────────────────────────────────────────────────────

export async function listMyTimesheets(employeeId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize
  const [data, total] = await Promise.all([
    prisma.timesheet.findMany({
      where: { employeeId },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
      orderBy: { weekStartDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.timesheet.count({ where: { employeeId } }),
  ])
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function upsertMyTimesheet(
  employeeId: string,
  data: z.infer<typeof timesheetSelfEntrySchema>,
) {
  const weekStart = new Date(data.weekStartDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Get or create the timesheet
  const timesheet = await prisma.timesheet.upsert({
    where: { employeeId_weekStartDate: { employeeId, weekStartDate: weekStart } },
    create: { employeeId, weekStartDate: weekStart, weekEndDate: weekEnd, status: 'DRAFT' },
    update: {},
  })

  if (timesheet.status !== 'DRAFT') {
    throw new AppError(400, 'Timesheet has already been submitted and cannot be edited')
  }

  // Replace entries for dates in the payload
  for (const entry of data.entries) {
    const entryDate = new Date(entry.entryDate)
    const clockIn = new Date(entry.clockIn)
    const clockOut = new Date(entry.clockOut)

    const totalMs = clockOut.getTime() - clockIn.getTime()
    const breakMs = entry.breakMinutes * 60 * 1000
    const workedMs = Math.max(0, totalMs - breakMs)
    const totalHours = workedMs / (1000 * 60 * 60)

    // Ordinary time is first 7.6h per day, rest is overtime
    const ordinaryHours = Math.min(totalHours, 7.6)
    const overtimeHours = Math.max(0, totalHours - 7.6)

    // Delete any existing entry for this date
    await prisma.timesheetEntry.deleteMany({
      where: { timesheetId: timesheet.id, entryDate },
    })

    await prisma.timesheetEntry.create({
      data: {
        timesheetId: timesheet.id,
        entryDate,
        clockIn,
        clockOut,
        totalHours,
        ordinaryHours,
        overtimeHours,
        isManualEntry: true,
        notes: entry.notes,
      },
    })
  }

  // Recalculate totals
  const entries = await prisma.timesheetEntry.findMany({ where: { timesheetId: timesheet.id } })
  const totalOrdinary = entries.reduce((sum, e) => sum + Number(e.ordinaryHours), 0)
  const totalOvertime = entries.reduce((sum, e) => sum + Number(e.overtimeHours), 0)

  return prisma.timesheet.update({
    where: { id: timesheet.id },
    data: {
      totalOrdinaryHours: totalOrdinary,
      totalOvertimeHours: totalOvertime,
      totalHours: totalOrdinary + totalOvertime,
    },
    include: { entries: { orderBy: { entryDate: 'asc' } } },
  })
}

export async function submitMyTimesheet(id: string, employeeId: string, userId: string) {
  const timesheet = await prisma.timesheet.findFirst({ where: { id, employeeId } })
  if (!timesheet) throw new NotFoundError('Timesheet')
  if (timesheet.status !== 'DRAFT') throw new AppError(400, 'Timesheet already submitted')

  return prisma.timesheet.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date(), submittedBy: userId },
    include: { entries: true },
  })
}

// ─── Payslips ────────────────────────────────────────────────────────────────

export async function listMyPayslips(employeeId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize
  const [data, total] = await Promise.all([
    prisma.payRunItem.findMany({
      where: { employeeId, payRun: { status: { in: ['APPROVED', 'FINALISED'] } } },
      include: {
        payRun: {
          select: {
            id: true,
            periodStartDate: true,
            periodEndDate: true,
            payDate: true,
            payFrequency: true,
            status: true,
          },
        },
      },
      orderBy: { payRun: { payDate: 'desc' } },
      skip,
      take: pageSize,
    }),
    prisma.payRunItem.count({
      where: { employeeId, payRun: { status: { in: ['APPROVED', 'FINALISED'] } } },
    }),
  ])
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ─── Leave balances ───────────────────────────────────────────────────────────

export async function getMyLeaveBalances(employeeId: string) {
  return prisma.leaveBalance.findMany({ where: { employeeId } })
}

export async function listMyLeaveRequests(employeeId: string) {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { startDate: 'desc' },
  })
}
