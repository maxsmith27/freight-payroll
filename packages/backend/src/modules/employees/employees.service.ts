import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'
import { encrypt, decrypt, encryptOptional, decryptOptional } from '../../lib/crypto.js'

// ─── Schemas ────────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1).max(20).optional(), // auto-generated if omitted
  depotId: z.string().optional(),
  firstName: z.string().min(1).max(50),
  middleName: z.string().max(50).optional(),
  lastName: z.string().min(1).max(50),
  preferredName: z.string().max(50).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  addressStreet: z.string().optional(),
  addressSuburb: z.string().optional(),
  addressState: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),
  addressPostcode: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR']),
  startDate: z.string().datetime(),
  awardCode: z.enum(['MA000038', 'MA000039']).optional(),
  payFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  taxResidencyStatus: z.enum(['RESIDENT', 'FOREIGN_RESIDENT', 'WORKING_HOLIDAY_MAKER']).default('RESIDENT'),
  claimsTaxFreeThreshold: z.boolean().default(true),
  hasHECSDebt: z.boolean().default(false),
  superFundName: z.string().optional(),
  superFundAbn: z.string().optional(),
  superMemberNumber: z.string().optional(),
  superFundUsi: z.string().optional(),
  reportsToId: z.string().optional(),
  // State of employment — drives public holiday schedule (may differ from residential state)
  stateOfEmployment: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),
  // Agreed ordinary hours per week (for part-timers and salaried employees)
  ordinaryHoursPerWeek: z.number().positive().max(38).optional(),
  // Sensitive — will be encrypted
  taxFileNumber: z.string().regex(/^\d{9}$/, 'TFN must be 9 digits').optional(),
})

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({
  employeeNumber: true,
})

export const payRateSchema = z.object({
  effectiveFrom: z.string().datetime(),
  payType: z.enum(['HOURLY', 'SALARY', 'PER_KM', 'PER_LOAD', 'PERCENTAGE_REVENUE', 'MIXED']),
  hourlyRate: z.number().positive().optional(),
  ratePerKm: z.number().positive().optional(),
  ratePerLoad: z.number().positive().optional(),
  revenuePercentage: z.number().min(0).max(1).optional(),
  annualSalary: z.number().positive().optional(),
  notes: z.string().optional(),
})

export const awardClassificationSchema = z.object({
  effectiveFrom: z.string().datetime(),
  awardCode: z.enum(['MA000038', 'MA000039']),
  classificationLevel: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5']),
  vehicleGrade: z.enum(['LIGHT_RIGID', 'MEDIUM_RIGID', 'HEAVY_RIGID', 'ARTICULATED', 'COMBINATION']).optional(),
})

export const bankAccountSchema = z.object({
  bsb: z.string().regex(/^\d{6}$/, 'BSB must be 6 digits'),
  accountNumber: z.string().min(5).max(10),
  accountName: z.string().min(1).max(50),
  isPrimary: z.boolean().default(false),
  allocationPercent: z.number().min(1).max(100).optional(),
  allocationAmount: z.number().positive().optional(),
})

// ─── List & search ──────────────────────────────────────────────────────────

export interface EmployeeListFilters {
  search?: string
  depotId?: string
  employmentType?: string
  isActive?: boolean
  awardCode?: string
  page?: number
  pageSize?: number
}

export async function listEmployees(companyId: string, filters: EmployeeListFilters = {}) {
  const { search, depotId, employmentType, isActive = true, awardCode, page = 1, pageSize = 50 } = filters

  const where = {
    companyId,
    deletedAt: null as null,
    isActive,
    ...(depotId ? { depotId } : {}),
    ...(employmentType ? { employmentType: employmentType as any } : {}),
    ...(awardCode ? { awardCode: awardCode as any } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { employeeNumber: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        depot: { select: { name: true, code: true } },
        payRates: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        awardClassifications: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        leaveBalances: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ])

  return {
    data: employees,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getEmployee(id: string, companyId: string, depotScope?: string | null) {
  const employee = await prisma.employee.findFirst({
    where: { id, companyId, deletedAt: null, ...(depotScope ? { depotId: depotScope } : {}) },
    include: {
      depot: true,
      payRates: { orderBy: { effectiveFrom: 'desc' } },
      awardClassifications: { orderBy: { effectiveFrom: 'desc' } },
      bankAccounts: true,
      emergencyContacts: true,
      documents: { orderBy: { createdAt: 'desc' } },
      leaveBalances: true,
      licences: { where: { isActive: true } },
      accreditations: { where: { isActive: true } },
      medicalCerts: { where: { isActive: true } },
      user: { select: { email: true, isActive: true } },
    },
  })

  if (!employee) throw new NotFoundError('Employee')

  // Decrypt sensitive fields for authorized access
  return {
    ...employee,
    taxFileNumber: decryptOptional(employee.taxFileNumber),
    portalUser: employee.user ? { email: employee.user.email, isActive: employee.user.isActive } : null,
    bankAccounts: employee.bankAccounts.map(ba => ({
      ...ba,
      bsb: decryptOptional(ba.bsb) ?? ba.bsb,
      accountNumber: decryptOptional(ba.accountNumber) ?? ba.accountNumber,
    })),
  }
}

export async function grantPortalAccess(
  employeeId: string,
  companyId: string,
  password: string,
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
    include: { user: true },
  })
  if (!employee) throw new NotFoundError('Employee')
  if (!employee.email) throw new AppError(400, 'Employee must have an email address to grant portal access')
  if (employee.user) throw new AppError(409, 'This employee already has portal access')

  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(password, 12)

  // Find the organization for this company
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  })
  if (!company) throw new NotFoundError('Company')

  // Check if a user with this email already exists in the org
  const existingUser = await prisma.user.findUnique({ where: { email: employee.email.toLowerCase() } })
  if (existingUser) throw new AppError(409, 'A user account with this email already exists')

  const user = await prisma.user.create({
    data: {
      organizationId: company.organizationId,
      email: employee.email.toLowerCase(),
      passwordHash,
      firstName: employee.firstName,
      lastName: employee.lastName,
      globalRole: 'ORG_USER',
      employeeId: employee.id,
      companyAccess: {
        create: {
          companyId,
          role: 'EMPLOYEE',
        },
      },
    },
  })

  return { userId: user.id, email: user.email, temporaryPassword: password }
}

export async function revokePortalAccess(employeeId: string, companyId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
    include: { user: true },
  })
  if (!employee) throw new NotFoundError('Employee')
  if (!employee.user) throw new AppError(400, 'This employee does not have portal access')

  // Revoke all refresh tokens and deactivate
  await prisma.refreshToken.updateMany({
    where: { userId: employee.user.id },
    data: { revokedAt: new Date() },
  })
  await prisma.user.update({
    where: { id: employee.user.id },
    data: { isActive: false },
  })
}

export async function createEmployee(
  companyId: string,
  data: z.infer<typeof createEmployeeSchema>,
  createdBy: string,
) {
  // Auto-generate employee number if not provided
  let employeeNumber = data.employeeNumber
  if (!employeeNumber) {
    const last = await prisma.employee.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { employeeNumber: true },
    })
    const lastNum = last?.employeeNumber
      ? parseInt(last.employeeNumber.replace(/\D/g, '') || '0', 10)
      : 0
    employeeNumber = String(lastNum + 1).padStart(4, '0')
  }

  // Check employee number uniqueness
  const existing = await prisma.employee.findUnique({
    where: { companyId_employeeNumber: { companyId, employeeNumber } },
  })
  if (existing) throw new AppError(409, `Employee number ${employeeNumber} is already in use`)

  // Exclude employeeNumber from rest — use the locally generated/validated variable
  const { taxFileNumber, employeeNumber: _empNum, ...rest } = data

  const employee = await prisma.employee.create({
    data: {
      ...rest,
      employeeNumber,
      companyId,
      startDate: new Date(data.startDate),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      taxFileNumber: encryptOptional(taxFileNumber),
      stateOfEmployment: data.stateOfEmployment ?? undefined,
      ordinaryHoursPerWeek: data.ordinaryHoursPerWeek ?? undefined,
    },
  })

  // Initialise leave balances
  await initialiseLeaveBalances(employee.id)

  return employee
}

export async function updateEmployee(
  id: string,
  companyId: string,
  data: z.infer<typeof updateEmployeeSchema>,
  updatedBy: string,
  depotScope?: string | null,
) {
  const employee = await prisma.employee.findFirst({ where: { id, companyId, deletedAt: null, ...(depotScope ? { depotId: depotScope } : {}) } })
  if (!employee) throw new NotFoundError('Employee')

  const { taxFileNumber, ...rest } = data

  return prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      startDate: rest.startDate ? new Date(rest.startDate) : undefined,
      dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
      ...(taxFileNumber !== undefined ? { taxFileNumber: encryptOptional(taxFileNumber) } : {}),
    },
  })
}

export async function terminateEmployee(
  id: string,
  companyId: string,
  data: { endDate: string; terminationReason?: string },
  depotScope?: string | null,
) {
  const employee = await prisma.employee.findFirst({ where: { id, companyId, deletedAt: null, ...(depotScope ? { depotId: depotScope } : {}) } })
  if (!employee) throw new NotFoundError('Employee')

  return prisma.employee.update({
    where: { id },
    data: {
      isActive: false,
      endDate: new Date(data.endDate),
      terminationReason: data.terminationReason,
    },
  })
}

// ─── Pay rates ──────────────────────────────────────────────────────────────

export async function addPayRate(
  employeeId: string,
  companyId: string,
  data: z.infer<typeof payRateSchema>,
  createdBy: string,
  depotScope?: string | null,
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, ...(depotScope ? { depotId: depotScope } : {}) },
    include: {
      awardClassifications: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  })
  if (!employee) throw new NotFoundError('Employee')

  // ── Award minimum floor check ──────────────────────────────────────────────
  // For hourly rates we enforce that the proposed rate is at least the award minimum.
  if (data.payType === 'HOURLY' && data.hourlyRate && employee.awardClassifications.length > 0) {
    const classification = employee.awardClassifications[0]
    const awardMin = await prisma.awardBaseRate.findFirst({
      where: {
        award: classification.awardCode,
        classificationLevel: classification.classificationLevel,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    })
    if (awardMin && data.hourlyRate < Number(awardMin.hourlyRate)) {
      throw new AppError(
        422,
        `Rate $${data.hourlyRate.toFixed(2)}/hr is below the award minimum of $${Number(awardMin.hourlyRate).toFixed(2)}/hr for ${classification.classificationLevel.replace('_', ' ')} under ${classification.awardCode}. ` +
          `The employee's rate must be at or above the award minimum.`,
      )
    }
  }
  // For salary, convert to hourly equivalent (÷ 52 ÷ 38) and enforce floor
  if (data.payType === 'SALARY' && data.annualSalary && employee.awardClassifications.length > 0) {
    const classification = employee.awardClassifications[0]
    const awardMin = await prisma.awardBaseRate.findFirst({
      where: {
        award: classification.awardCode,
        classificationLevel: classification.classificationLevel,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: 'desc' },
    })
    if (awardMin) {
      const hourlyEquivalent = data.annualSalary / 52 / 38
      const minHourly = Number(awardMin.hourlyRate)
      if (hourlyEquivalent < minHourly) {
        throw new AppError(
          422,
          `Annual salary of $${data.annualSalary.toLocaleString()} equates to $${hourlyEquivalent.toFixed(2)}/hr, which is below the award minimum of $${minHourly.toFixed(2)}/hr. ` +
            `Minimum equivalent annual salary is $${(minHourly * 38 * 52).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
        )
      }
    }
  }

  const effectiveFrom = new Date(data.effectiveFrom)

  // Close off any current rate
  await prisma.employeePayRate.updateMany({
    where: { employeeId, effectiveTo: null },
    data: { effectiveTo: effectiveFrom },
  })

  return prisma.employeePayRate.create({
    data: {
      employeeId,
      effectiveFrom,
      payType: data.payType,
      hourlyRate: data.hourlyRate,
      ratePerKm: data.ratePerKm,
      ratePerLoad: data.ratePerLoad,
      revenuePercentage: data.revenuePercentage,
      annualSalary: data.annualSalary,
      notes: data.notes,
      createdBy,
    },
  })
}

export async function addAwardClassification(
  employeeId: string,
  companyId: string,
  data: z.infer<typeof awardClassificationSchema>,
  createdBy: string,
  depotScope?: string | null,
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, ...(depotScope ? { depotId: depotScope } : {}) } })
  if (!employee) throw new NotFoundError('Employee')

  const effectiveFrom = new Date(data.effectiveFrom)

  await prisma.employeeAwardClassification.updateMany({
    where: { employeeId, effectiveTo: null },
    data: { effectiveTo: effectiveFrom },
  })

  const { effectiveFrom: _ef, ...restData } = data
  return prisma.employeeAwardClassification.create({
    data: { employeeId, effectiveFrom, ...restData, createdBy },
  })
}

// ─── Bank accounts ──────────────────────────────────────────────────────────

export async function addBankAccount(
  employeeId: string,
  companyId: string,
  data: z.infer<typeof bankAccountSchema>,
  depotScope?: string | null,
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, ...(depotScope ? { depotId: depotScope } : {}) } })
  if (!employee) throw new NotFoundError('Employee')

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
      allocationAmount: data.allocationAmount,
    },
  })
}

export async function getBankAccounts(employeeId: string, companyId: string, depotScope?: string | null) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, ...(depotScope ? { depotId: depotScope } : {}) } })
  if (!employee) throw new NotFoundError('Employee')

  const accounts = await prisma.bankAccount.findMany({ where: { employeeId } })
  return accounts.map(a => ({
    ...a,
    bsb: decrypt(a.bsb),
    accountNumber: decrypt(a.accountNumber),
  }))
}

// ─── Emergency contacts ──────────────────────────────────────────────────────

export async function addEmergencyContact(
  employeeId: string,
  companyId: string,
  data: {
    name: string
    relationship: string
    phone: string
    mobile?: string
    email?: string
    isPrimary?: boolean
  },
  depotScope?: string | null,
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId, ...(depotScope ? { depotId: depotScope } : {}) } })
  if (!employee) throw new NotFoundError('Employee')

  if (data.isPrimary) {
    await prisma.emergencyContact.updateMany({
      where: { employeeId },
      data: { isPrimary: false },
    })
  }

  return prisma.emergencyContact.create({ data: { employeeId, ...data } })
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface EmployeeImportRow {
  employeeNumber: string
  firstName: string
  lastName: string
  email?: string
  mobile?: string
  employmentType: string
  startDate: string
  payFrequency: string
  hourlyRate?: number
  awardCode?: string
  classificationLevel?: string
  depotCode?: string
}

export async function importEmployees(
  companyId: string,
  rows: EmployeeImportRow[],
  createdBy: string,
): Promise<{ created: number; errors: Array<{ row: number; error: string }> }> {
  const errors: Array<{ row: number; error: string }> = []
  let created = 0

  const depots = await prisma.depot.findMany({ where: { companyId, deletedAt: null } })
  const depotMap = new Map(depots.map(d => [d.code, d.id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const depotId = row.depotCode ? depotMap.get(row.depotCode.toUpperCase()) : undefined

      const employee = await createEmployee(
        companyId,
        {
          employeeNumber: row.employeeNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          mobile: row.mobile,
          employmentType: row.employmentType as any,
          startDate: new Date(row.startDate).toISOString(),
          payFrequency: row.payFrequency as any,
          awardCode: row.awardCode as any,
          depotId,
          taxResidencyStatus: 'RESIDENT' as const,
          claimsTaxFreeThreshold: true,
          hasHECSDebt: false,
        },
        createdBy,
      )

      if (row.hourlyRate) {
        await addPayRate(
          employee.id,
          companyId,
          {
            effectiveFrom: new Date(row.startDate).toISOString(),
            payType: 'HOURLY',
            hourlyRate: row.hourlyRate,
          },
          createdBy,
        )
      }

      if (row.awardCode && row.classificationLevel) {
        await addAwardClassification(
          employee.id,
          companyId,
          {
            effectiveFrom: new Date(row.startDate).toISOString(),
            awardCode: row.awardCode as any,
            classificationLevel: row.classificationLevel as any,
          },
          createdBy,
        )
      }

      created++
    } catch (err) {
      errors.push({ row: i + 1, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { created, errors }
}

// ─── Leave balance initialisation ───────────────────────────────────────────

async function initialiseLeaveBalances(employeeId: string) {
  const leaveTypes = [
    'ANNUAL',
    'PERSONAL_CARERS',
    'COMPASSIONATE',
    'LONG_SERVICE',
  ] as const

  await prisma.leaveBalance.createMany({
    data: leaveTypes.map(lt => ({
      employeeId,
      leaveType: lt,
      accrued: 0,
      used: 0,
      pending: 0,
      balance: 0,
    })),
    skipDuplicates: true,
  })
}
