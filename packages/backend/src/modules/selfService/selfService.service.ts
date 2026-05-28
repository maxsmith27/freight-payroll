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

// ─── Leave request submission ─────────────────────────────────────────────────

export const leaveRequestSchema = z.object({
  leaveType: z.enum([
    'ANNUAL',
    'PERSONAL_CARERS',
    'COMPASSIONATE',
    'LONG_SERVICE',
    'PARENTAL',
    'COMMUNITY_SERVICE',
    'UNPAID',
  ]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalHours: z.number().positive(),
  reason: z.string().max(500).optional(),
})

export async function submitLeaveRequest(
  employeeId: string,
  data: z.infer<typeof leaveRequestSchema>,
) {
  const balance = await prisma.leaveBalance.findFirst({
    where: { employeeId, leaveType: data.leaveType as any },
  })

  // Warn if insufficient balance (soft check — don't block, manager decides)
  const available = balance ? Number(balance.accrued) - Number(balance.used) - Number(balance.pending) : 0

  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const msPerDay = 86400000
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1)

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveType: data.leaveType as any,
      startDate: start,
      endDate: end,
      totalDays,
      totalHours: data.totalHours,
      reason: data.reason ?? null,
      status: 'PENDING',
    },
  })

  // Update pending balance
  if (balance) {
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { pending: { increment: data.totalHours } },
    })
  }

  return {
    ...request,
    availableHours: available,
    warning: available < data.totalHours ? `You have ${available.toFixed(1)} hrs available — this request exceeds your balance and requires manager approval.` : null,
  }
}

export async function cancelMyLeaveRequest(requestId: string, employeeId: string) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId, employeeId },
  })
  if (!request) throw new NotFoundError('Leave request')
  if (request.status !== 'PENDING') {
    throw new AppError(400, 'Only pending requests can be cancelled')
  }

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  })

  // Reverse pending deduction
  const balance = await prisma.leaveBalance.findFirst({
    where: { employeeId, leaveType: request.leaveType },
  })
  if (balance) {
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { pending: { decrement: Number(request.totalHours) } },
    })
  }

  return { cancelled: true }
}

// ─── Profile update ───────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  preferredName: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  addressStreet: z.string().max(100).optional(),
  addressSuburb: z.string().max(50).optional(),
  addressState: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),
  addressPostcode: z.string().max(4).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
})

export async function updateMyProfile(
  userId: string,
  data: z.infer<typeof updateProfileSchema>,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { employeeId: true },
  })
  if (!user?.employeeId) throw new NotFoundError('Employee profile')

  const { emergencyContactName, emergencyContactPhone, emergencyContactRelationship, ...empData } = data

  await prisma.employee.update({
    where: { id: user.employeeId },
    data: empData,
  })

  // Update primary emergency contact if provided
  if (emergencyContactName || emergencyContactPhone) {
    const existing = await prisma.emergencyContact.findFirst({
      where: { employeeId: user.employeeId, isPrimary: true },
    })
    if (existing) {
      await prisma.emergencyContact.update({
        where: { id: existing.id },
        data: {
          ...(emergencyContactName ? { name: emergencyContactName } : {}),
          ...(emergencyContactPhone ? { phone: emergencyContactPhone } : {}),
          ...(emergencyContactRelationship ? { relationship: emergencyContactRelationship } : {}),
        },
      })
    }
  }

  return { updated: true }
}

// ─── Bank accounts ─────────────────────────────────────────────────────────────

import { decrypt, encrypt } from '../../lib/crypto.js'

export async function getMyBankAccounts(employeeId: string) {
  const accounts = await prisma.bankAccount.findMany({ where: { employeeId } })
  return accounts.map(a => ({
    id: a.id,
    accountName: a.accountName,
    bsb: decrypt(a.bsb),
    accountNumber: decrypt(a.accountNumber),
    isPrimary: a.isPrimary,
    allocationPercent: a.allocationPercent,
  }))
}

export const bankAccountSchema = z.object({
  bsb: z.string().regex(/^\d{6}$/, 'BSB must be 6 digits'),
  accountNumber: z.string().min(5).max(10),
  accountName: z.string().min(1).max(50),
  isPrimary: z.boolean().default(false),
  allocationPercent: z.number().min(1).max(100).optional(),
})

export async function addMyBankAccount(
  employeeId: string,
  data: z.infer<typeof bankAccountSchema>,
) {
  if (data.isPrimary) {
    await prisma.bankAccount.updateMany({
      where: { employeeId },
      data: { isPrimary: false },
    })
  }
  return prisma.bankAccount.create({
    data: {
      employeeId,
      bsb: encrypt(data.bsb),
      accountNumber: encrypt(data.accountNumber),
      accountName: data.accountName,
      isPrimary: data.isPrimary,
      allocationPercent: data.allocationPercent,
    },
  })
}

export async function updateMyBankAccount(
  accountId: string,
  employeeId: string,
  data: Partial<z.infer<typeof bankAccountSchema>>,
) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, employeeId },
  })
  if (!account) throw new NotFoundError('Bank account')

  if (data.isPrimary) {
    await prisma.bankAccount.updateMany({ where: { employeeId }, data: { isPrimary: false } })
  }

  return prisma.bankAccount.update({
    where: { id: accountId },
    data: {
      ...(data.bsb ? { bsb: encrypt(data.bsb) } : {}),
      ...(data.accountNumber ? { accountNumber: encrypt(data.accountNumber) } : {}),
      ...(data.accountName ? { accountName: data.accountName } : {}),
      ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
      ...(data.allocationPercent !== undefined ? { allocationPercent: data.allocationPercent } : {}),
    },
  })
}

export async function deleteMyBankAccount(accountId: string, employeeId: string) {
  const account = await prisma.bankAccount.findFirst({ where: { id: accountId, employeeId } })
  if (!account) throw new NotFoundError('Bank account')
  if (account.isPrimary) throw new AppError(400, 'Cannot delete your primary bank account. Set another account as primary first.')
  await prisma.bankAccount.delete({ where: { id: accountId } })
  return { deleted: true }
}

// ─── Compliance documents ────────────────────────────────────────────────────

export async function getMyComplianceDocs(employeeId: string) {
  const [licences, accreditations, medicals] = await Promise.all([
    prisma.driverLicence.findMany({
      where: { employeeId, isActive: true },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true, licenceNumber: true, licenceState: true, licenceClasses: true,
        issueDate: true, expiryDate: true, documentKey: true,
      },
    }),
    prisma.accreditation.findMany({
      where: { employeeId, isActive: true },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true, accreditationType: true, certificateNumber: true,
        issueDate: true, expiryDate: true, documentKey: true,
      },
    }),
    prisma.medicalCertificate.findMany({
      where: { employeeId, isActive: true },
      orderBy: { expiryDate: 'asc' },
      select: {
        id: true, certType: true, issueDate: true, expiryDate: true,
        restrictions: true, documentKey: true,
      },
    }),
  ])
  return { licences, accreditations, medicals }
}

export async function verifyComplianceDocOwnership(
  docType: 'licence' | 'accreditation' | 'medical',
  docId: string,
  employeeId: string,
): Promise<{ companyId: string } | null> {
  switch (docType) {
    case 'licence': {
      const r = await prisma.driverLicence.findFirst({
        where: { id: docId, employeeId },
        select: { employee: { select: { companyId: true } } },
      })
      return r ? { companyId: r.employee.companyId } : null
    }
    case 'accreditation': {
      const r = await prisma.accreditation.findFirst({
        where: { id: docId, employeeId },
        select: { employee: { select: { companyId: true } } },
      })
      return r ? { companyId: r.employee.companyId } : null
    }
    case 'medical': {
      const r = await prisma.medicalCertificate.findFirst({
        where: { id: docId, employeeId },
        select: { employee: { select: { companyId: true } } },
      })
      return r ? { companyId: r.employee.companyId } : null
    }
  }
}
