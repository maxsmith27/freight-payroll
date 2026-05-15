import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'
import { calculateLSLAccrual, PENALTY_RATES } from '@freight-payroll/shared'
import type { AustralianState, LeaveType } from '@freight-payroll/shared'

export const leaveRequestSchema = z.object({
  employeeId: z.string(),
  leaveType: z.enum(['ANNUAL', 'PERSONAL_CARERS', 'COMPASSIONATE', 'COMMUNITY_SERVICE', 'LONG_SERVICE', 'PARENTAL', 'UNPAID']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
})

// ─── Leave requests ─────────────────────────────────────────────────────────

export async function requestLeave(
  companyId: string,
  data: z.infer<typeof leaveRequestSchema>,
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, companyId, isActive: true },
  })
  if (!employee) throw new NotFoundError('Employee')

  const start = new Date(data.startDate)
  const end = new Date(data.endDate)

  // Calculate business days (excluding weekends and public holidays)
  const { days, hours } = await calculateLeaveDuration(start, end, employee.addressState as AustralianState)

  // Check balance for leave types that have a balance
  if (['ANNUAL', 'PERSONAL_CARERS', 'LONG_SERVICE'].includes(data.leaveType)) {
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveType: { employeeId: data.employeeId, leaveType: data.leaveType as any } },
    })
    // Allow leave in advance — but flag it
    if (balance && Number(balance.balance) < hours) {
      // Don't block it — managers can approve leave in advance
    }
  }

  // Mark balance as pending
  await prisma.leaveBalance.updateMany({
    where: { employeeId: data.employeeId, leaveType: data.leaveType as any },
    data: { pending: { increment: hours } },
  })

  return prisma.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveType: data.leaveType as any,
      startDate: start,
      endDate: end,
      totalDays: days,
      totalHours: hours,
      reason: data.reason,
      status: 'PENDING',
    },
  })
}

export async function approveLeave(
  id: string,
  companyId: string,
  approvedBy: string,
  notes?: string,
) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id, employee: { companyId }, status: 'PENDING' },
  })
  if (!request) throw new NotFoundError('Leave request')

  return prisma.leaveRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedBy: approvedBy,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  })
}

export async function declineLeave(
  id: string,
  companyId: string,
  declinedBy: string,
  notes: string,
) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id, employee: { companyId }, status: 'PENDING' },
  })
  if (!request) throw new NotFoundError('Leave request')

  // Return pending hours to balance
  await prisma.leaveBalance.updateMany({
    where: { employeeId: request.employeeId, leaveType: request.leaveType },
    data: { pending: { decrement: Number(request.totalHours) } },
  })

  return prisma.leaveRequest.update({
    where: { id },
    data: {
      status: 'DECLINED',
      reviewedBy: declinedBy,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  })
}

export async function listLeaveRequests(
  companyId: string,
  filters: { employeeId?: string; status?: string; page?: number } = {},
) {
  const { employeeId, status, page = 1 } = filters
  const pageSize = 50

  const where = {
    employee: { companyId },
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status: status as any } : {}),
  }

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leaveRequest.count({ where }),
  ])

  return { data: requests, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getLeaveBalances(employeeId: string, companyId: string) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } })
  if (!employee) throw new NotFoundError('Employee')
  return prisma.leaveBalance.findMany({ where: { employeeId } })
}

// ─── Leave accrual engine ────────────────────────────────────────────────────

/**
 * Process leave accrual for all active employees in a company for a pay period.
 * Called after each pay run is finalised.
 */
export async function processLeaveAccruals(
  companyId: string,
  periodStartDate: Date,
  periodEndDate: Date,
  payFrequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY',
) {
  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true, deletedAt: null },
  })

  // Pay periods per year
  const periodsPerYear = payFrequency === 'WEEKLY' ? 52 : payFrequency === 'FORTNIGHTLY' ? 26 : 12

  for (const employee of employees) {
    await accrueLeaveForEmployee(employee.id, periodsPerYear, periodEndDate)
  }
}

async function accrueLeaveForEmployee(
  employeeId: string,
  periodsPerYear: number,
  accrualDate: Date,
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return

  // Annual leave: 4 weeks per year = 152 hours
  // Casual employees don't accrue annual leave
  if (employee.employmentType !== 'CASUAL') {
    const annualLeaveHoursPerPeriod = (4 * 38) / periodsPerYear

    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveType: { employeeId, leaveType: 'ANNUAL' } },
      create: {
        employeeId,
        leaveType: 'ANNUAL',
        accrued: annualLeaveHoursPerPeriod,
        balance: annualLeaveHoursPerPeriod,
        lastAccrualDate: accrualDate,
      },
      update: {
        accrued: { increment: annualLeaveHoursPerPeriod },
        balance: { increment: annualLeaveHoursPerPeriod },
        lastAccrualDate: accrualDate,
      },
    })
  }

  // Personal/carer's leave: 10 days per year = 76 hours
  if (employee.employmentType !== 'CASUAL') {
    const personalLeaveHoursPerPeriod = (10 * 7.6) / periodsPerYear

    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveType: { employeeId, leaveType: 'PERSONAL_CARERS' } },
      create: {
        employeeId,
        leaveType: 'PERSONAL_CARERS',
        accrued: personalLeaveHoursPerPeriod,
        balance: personalLeaveHoursPerPeriod,
        lastAccrualDate: accrualDate,
      },
      update: {
        accrued: { increment: personalLeaveHoursPerPeriod },
        balance: { increment: personalLeaveHoursPerPeriod },
        lastAccrualDate: accrualDate,
      },
    })
  }

  // LSL — accrues from day 1, payable after qualifying period
  const yearsService = (accrualDate.getTime() - employee.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  const state = employee.addressState as AustralianState
  if (state) {
    const { accruedWeeks } = calculateLSLAccrual(state, yearsService)
    const accruedHours = accruedWeeks * 38

    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveType: { employeeId, leaveType: 'LONG_SERVICE' } },
      create: { employeeId, leaveType: 'LONG_SERVICE', accrued: accruedHours, balance: accruedHours },
      update: { accrued: accruedHours, balance: accruedHours, lastAccrualDate: accrualDate },
    })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function calculateLeaveDuration(
  startDate: Date,
  endDate: Date,
  state?: AustralianState,
): Promise<{ days: number; hours: number }> {
  let days = 0
  const current = new Date(startDate)

  const publicHolidays = state
    ? await prisma.publicHoliday.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          OR: [{ state: null }, { state }],
        },
      })
    : []

  const phDates = new Set(publicHolidays.map(ph => ph.date.toISOString().split('T')[0]))

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !phDates.has(dateStr)) {
      days++
    }
    current.setDate(current.getDate() + 1)
  }

  return { days, hours: days * 7.6 }
}
