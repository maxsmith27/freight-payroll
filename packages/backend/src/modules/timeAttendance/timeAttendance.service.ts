import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'
import { PENALTY_RATES } from '@freight-payroll/shared'

export const clockInSchema = z.object({
  employeeId: z.string(),
  clockIn: z.string().datetime(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  depotId: z.string().optional(),
  costCentre: z.string().optional(),
})

export const clockOutSchema = z.object({
  clockOut: z.string().datetime(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export const manualEntrySchema = z.object({
  employeeId: z.string(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime(),
  breakMinutes: z.number().min(0).default(0),
  notes: z.string().optional(),
  costCentre: z.string().optional(),
})

// ─── Clock in/out ────────────────────────────────────────────────────────────

export async function clockIn(
  companyId: string,
  data: z.infer<typeof clockInSchema>,
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, companyId, isActive: true },
  })
  if (!employee) throw new NotFoundError('Employee')

  const clockInDate = new Date(data.clockIn)
  const weekStart = getWeekMonday(clockInDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Get or create timesheet for the week
  const timesheet = await prisma.timesheet.upsert({
    where: { employeeId_weekStartDate: { employeeId: data.employeeId, weekStartDate: weekStart } },
    create: {
      employeeId: data.employeeId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      status: 'DRAFT',
    },
    update: {},
  })

  // Check for open entry
  const openEntry = await prisma.timesheetEntry.findFirst({
    where: { timesheetId: timesheet.id, clockIn: { not: null }, clockOut: null },
  })
  if (openEntry) {
    throw new AppError(400, 'Employee already has an open clock-in for this week')
  }

  return prisma.timesheetEntry.create({
    data: {
      timesheetId: timesheet.id,
      entryDate: clockInDate,
      clockIn: clockInDate,
      clockInLat: data.lat,
      clockInLng: data.lng,
      depotId: data.depotId,
      costCentre: data.costCentre,
    },
  })
}

export async function clockOut(
  companyId: string,
  entryId: string,
  data: z.infer<typeof clockOutSchema>,
) {
  const entry = await prisma.timesheetEntry.findFirst({
    where: {
      id: entryId,
      timesheet: { employee: { companyId } },
      clockIn: { not: null },
      clockOut: null,
    },
    include: { timesheet: true },
  })
  if (!entry) throw new NotFoundError('Open timesheet entry')

  const clockOutDate = new Date(data.clockOut)
  const grossMinutes = (clockOutDate.getTime() - entry.clockIn!.getTime()) / 60000

  // Auto-deduct break time per award (30 min if worked 5+ hours)
  const autoBreakMinutes = grossMinutes >= 300 ? 30 : 0
  const workedMinutes = grossMinutes - autoBreakMinutes
  const workedHours = workedMinutes / 60

  const ordinaryHours = Math.min(workedHours, PENALTY_RATES.ordinary_hours_per_day)
  const overtimeHours = Math.max(0, workedHours - PENALTY_RATES.ordinary_hours_per_day)

  const updatedEntry = await prisma.timesheetEntry.update({
    where: { id: entryId },
    data: {
      clockOut: clockOutDate,
      clockOutLat: data.lat,
      clockOutLng: data.lng,
      totalHours: workedHours,
      ordinaryHours,
      overtimeHours,
      ...(autoBreakMinutes > 0 ? {
        breaks: {
          create: {
            startTime: new Date(entry.clockIn!.getTime() + 5 * 60 * 60 * 1000), // 5hrs in
            durationMinutes: autoBreakMinutes,
            breakType: 'UNPAID',
          },
        },
      } : {}),
    },
  })

  // Recalculate timesheet totals
  await recalculateTimesheetTotals(entry.timesheetId)
  return updatedEntry
}

export async function addManualEntry(
  companyId: string,
  data: z.infer<typeof manualEntrySchema>,
  submittedBy: string,
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, companyId, isActive: true },
  })
  if (!employee) throw new NotFoundError('Employee')

  const entryDate = new Date(data.entryDate)
  const weekStart = getWeekMonday(entryDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const timesheet = await prisma.timesheet.upsert({
    where: { employeeId_weekStartDate: { employeeId: data.employeeId, weekStartDate: weekStart } },
    create: { employeeId: data.employeeId, weekStartDate: weekStart, weekEndDate: weekEnd },
    update: {},
  })

  const clockIn = new Date(data.clockIn)
  const clockOut = new Date(data.clockOut)
  const workedMinutes = (clockOut.getTime() - clockIn.getTime()) / 60000 - data.breakMinutes
  const workedHours = Math.max(0, workedMinutes / 60)

  const entry = await prisma.timesheetEntry.create({
    data: {
      timesheetId: timesheet.id,
      entryDate,
      clockIn,
      clockOut,
      totalHours: workedHours,
      ordinaryHours: Math.min(workedHours, PENALTY_RATES.ordinary_hours_per_day),
      overtimeHours: Math.max(0, workedHours - PENALTY_RATES.ordinary_hours_per_day),
      isManualEntry: true,
      notes: data.notes,
      costCentre: data.costCentre,
    },
  })

  await recalculateTimesheetTotals(timesheet.id)
  return entry
}

// ─── Timesheet retrieval & approval ─────────────────────────────────────────

export async function listTimesheets(
  companyId: string,
  filters: {
    employeeId?: string
    status?: string
    weekStartDate?: string
    page?: number
    pageSize?: number
  } = {},
) {
  const { employeeId, status, weekStartDate, page = 1, pageSize = 50 } = filters

  const where = {
    employee: { companyId },
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status: status as any } : {}),
    ...(weekStartDate ? { weekStartDate: new Date(weekStartDate) } : {}),
  }

  const [timesheets, total] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        entries: { include: { breaks: true } },
      },
      orderBy: { weekStartDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.timesheet.count({ where }),
  ])

  return { data: timesheets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function submitTimesheet(id: string, companyId: string, submittedBy: string) {
  const ts = await prisma.timesheet.findFirst({
    where: { id, employee: { companyId }, status: 'DRAFT' },
  })
  if (!ts) throw new NotFoundError('Timesheet')

  return prisma.timesheet.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date(), submittedBy },
  })
}

export async function approveTimesheet(
  id: string,
  companyId: string,
  approvedBy: string,
  notes?: string,
) {
  const ts = await prisma.timesheet.findFirst({
    where: { id, employee: { companyId }, status: { in: ['SUBMITTED', 'DRAFT'] } },
  })
  if (!ts) throw new NotFoundError('Timesheet awaiting approval')

  return prisma.timesheet.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date(), reviewNotes: notes },
  })
}

export async function rejectTimesheet(
  id: string,
  companyId: string,
  rejectedBy: string,
  notes: string,
) {
  const ts = await prisma.timesheet.findFirst({
    where: { id, employee: { companyId }, status: 'SUBMITTED' },
  })
  if (!ts) throw new NotFoundError('Submitted timesheet')

  return prisma.timesheet.update({
    where: { id },
    data: { status: 'REJECTED', reviewedBy: rejectedBy, reviewedAt: new Date(), reviewNotes: notes },
  })
}

// ─── Exception report ────────────────────────────────────────────────────────

export async function getTimesheetExceptions(companyId: string, weekStartDate: Date) {
  const weekEnd = new Date(weekStartDate)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Employees with no timesheet for the week
  const activeEmployees = await prisma.employee.findMany({
    where: { companyId, isActive: true },
    select: { id: true, firstName: true, lastName: true, employeeNumber: true },
  })

  const timesheets = await prisma.timesheet.findMany({
    where: { employee: { companyId }, weekStartDate },
    include: { entries: true },
  })

  const tsEmployeeIds = new Set(timesheets.map(t => t.employeeId))

  return {
    missingTimesheets: activeEmployees.filter(e => !tsEmployeeIds.has(e.id)),
    openClockIns: await prisma.timesheetEntry.findMany({
      where: {
        timesheet: { employee: { companyId } },
        clockIn: { not: null },
        clockOut: null,
        entryDate: { gte: weekStartDate, lte: weekEnd },
      },
      include: { timesheet: { include: { employee: true } } },
    }),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function recalculateTimesheetTotals(timesheetId: string) {
  const entries = await prisma.timesheetEntry.findMany({ where: { timesheetId } })
  const totals = entries.reduce(
    (acc, e) => {
      acc.ordinary += Number(e.ordinaryHours)
      acc.overtime += Number(e.overtimeHours)
      acc.total += Number(e.totalHours)
      return acc
    },
    { ordinary: 0, overtime: 0, total: 0 },
  )

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: {
      totalOrdinaryHours: totals.ordinary,
      totalOvertimeHours: totals.overtime,
      totalHours: totals.total,
    },
  })
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}
