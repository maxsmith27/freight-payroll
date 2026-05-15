import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'

export const createRosterSchema = z.object({
  depotId: z.string().optional(),
  name: z.string().optional(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const createShiftSchema = z.object({
  employeeId: z.string().optional(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  vehicleId: z.string().optional(),
  runCode: z.string().optional(),
  depotId: z.string().optional(),
  costCentre: z.string().optional(),
  notes: z.string().optional(),
})

export async function createRoster(
  companyId: string,
  data: z.infer<typeof createRosterSchema>,
  createdBy: string,
) {
  const weekStart = new Date(data.weekStartDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return prisma.roster.create({
    data: {
      companyId,
      depotId: data.depotId,
      name: data.name,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      createdBy,
    },
  })
}

export async function getRoster(id: string, companyId: string) {
  const roster = await prisma.roster.findFirst({
    where: { id, companyId },
    include: {
      shifts: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        },
        orderBy: [{ shiftDate: 'asc' }, { startTime: 'asc' }],
      },
    },
  })
  if (!roster) throw new NotFoundError('Roster')
  return roster
}

export async function listRosters(companyId: string, page = 1) {
  const [rosters, total] = await Promise.all([
    prisma.roster.findMany({
      where: { companyId },
      include: { _count: { select: { shifts: true } } },
      orderBy: { weekStartDate: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.roster.count({ where: { companyId } }),
  ])
  return { data: rosters, total, page, pageSize: 20, totalPages: Math.ceil(total / 20) }
}

export async function addShift(
  rosterId: string,
  companyId: string,
  data: z.infer<typeof createShiftSchema>,
) {
  const roster = await prisma.roster.findFirst({ where: { id: rosterId, companyId } })
  if (!roster) throw new NotFoundError('Roster')

  if (roster.status === 'PUBLISHED') {
    throw new AppError(400, 'Cannot add shifts to a published roster. Create a new version.')
  }

  // Conflict check for employee
  let conflicts: string[] = []
  if (data.employeeId) {
    conflicts = await detectConflicts(data.employeeId, new Date(data.startTime), new Date(data.endTime), rosterId)
  }

  return prisma.rosterShift.create({
    data: {
      rosterId,
      employeeId: data.employeeId,
      shiftDate: new Date(data.shiftDate),
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      vehicleId: data.vehicleId,
      runCode: data.runCode,
      depotId: data.depotId,
      costCentre: data.costCentre,
      notes: data.notes,
      hasConflict: conflicts.length > 0,
      conflictDetails: conflicts.length > 0 ? conflicts : undefined,
    },
  })
}

export async function updateShift(
  shiftId: string,
  companyId: string,
  data: Partial<z.infer<typeof createShiftSchema>>,
) {
  const shift = await prisma.rosterShift.findFirst({
    where: { id: shiftId, roster: { companyId } },
  })
  if (!shift) throw new NotFoundError('Shift')

  return prisma.rosterShift.update({
    where: { id: shiftId },
    data: {
      employeeId: data.employeeId,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      vehicleId: data.vehicleId,
      runCode: data.runCode,
      notes: data.notes,
    },
  })
}

export async function deleteShift(shiftId: string, companyId: string) {
  const shift = await prisma.rosterShift.findFirst({
    where: { id: shiftId, roster: { companyId } },
  })
  if (!shift) throw new NotFoundError('Shift')
  await prisma.rosterShift.delete({ where: { id: shiftId } })
}

export async function publishRoster(
  rosterId: string,
  companyId: string,
  publishedBy: string,
) {
  const roster = await prisma.roster.findFirst({
    where: { id: rosterId, companyId, status: 'DRAFT' },
  })
  if (!roster) throw new NotFoundError('Draft roster')

  // Calculate estimated labour cost
  const estimatedCost = await calculateRosterCost(rosterId)

  return prisma.roster.update({
    where: { id: rosterId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishedBy,
      estimatedCost,
    },
  })
}

export async function copyRosterFromPreviousWeek(
  companyId: string,
  fromWeekStart: Date,
  toWeekStart: Date,
  createdBy: string,
) {
  const sourceRoster = await prisma.roster.findFirst({
    where: { companyId, weekStartDate: fromWeekStart },
    include: { shifts: true },
  })
  if (!sourceRoster) throw new NotFoundError('Source roster')

  const toWeekEnd = new Date(toWeekStart)
  toWeekEnd.setDate(toWeekEnd.getDate() + 6)

  const dayOffset = toWeekStart.getTime() - fromWeekStart.getTime()

  const newRoster = await prisma.roster.create({
    data: {
      companyId,
      depotId: sourceRoster.depotId,
      weekStartDate: toWeekStart,
      weekEndDate: toWeekEnd,
      createdBy,
    },
  })

  for (const shift of sourceRoster.shifts) {
    await prisma.rosterShift.create({
      data: {
        rosterId: newRoster.id,
        employeeId: shift.employeeId,
        shiftDate: new Date(shift.shiftDate.getTime() + dayOffset),
        startTime: new Date(shift.startTime.getTime() + dayOffset),
        endTime: new Date(shift.endTime.getTime() + dayOffset),
        vehicleId: shift.vehicleId,
        runCode: shift.runCode,
        depotId: shift.depotId,
        costCentre: shift.costCentre,
      },
    })
  }

  return getRoster(newRoster.id, companyId)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function detectConflicts(
  employeeId: string,
  startTime: Date,
  endTime: Date,
  excludeRosterId?: string,
): Promise<string[]> {
  const conflicts: string[] = []

  // Check double-booking
  const overlapping = await prisma.rosterShift.findMany({
    where: {
      employeeId,
      ...(excludeRosterId ? { rosterId: { not: excludeRosterId } } : {}),
      roster: { status: 'PUBLISHED' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  })
  if (overlapping.length > 0) {
    conflicts.push(`Employee already rostered ${overlapping.length} overlapping shift(s)`)
  }

  // Check licence expiry
  const expiredLicence = await prisma.driverLicence.findFirst({
    where: { employeeId, isActive: true, expiryDate: { lt: startTime } },
  })
  if (expiredLicence) {
    conflicts.push(`Driver licence expired on ${expiredLicence.expiryDate.toLocaleDateString('en-AU')}`)
  }

  // Check medical certificate expiry
  const expiredMedical = await prisma.medicalCertificate.findFirst({
    where: { employeeId, isActive: true, expiryDate: { lt: startTime } },
  })
  if (expiredMedical) {
    conflicts.push(`Medical certificate expired on ${expiredMedical.expiryDate.toLocaleDateString('en-AU')}`)
  }

  return conflicts
}

async function calculateRosterCost(rosterId: string): Promise<number> {
  const shifts = await prisma.rosterShift.findMany({
    where: { rosterId },
    include: {
      employee: {
        include: {
          payRates: { where: { effectiveTo: null }, take: 1, orderBy: { effectiveFrom: 'desc' } },
        },
      },
    },
  })

  let total = 0
  for (const shift of shifts) {
    const rate = Number(shift.employee?.payRates[0]?.hourlyRate ?? 0)
    const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / 3600000
    total += hours * rate
  }
  return Math.round(total * 100) / 100
}
