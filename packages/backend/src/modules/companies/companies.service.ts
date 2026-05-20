import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError, ForbiddenError } from '../../middleware/error.middleware.js'
import { encrypt, decrypt, encryptOptional, decryptOptional } from '../../lib/crypto.js'
import type { AustralianState } from '@freight-payroll/shared'

export const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  tradingName: z.string().max(100).optional(),
  abn: z.string().regex(/^\d{11}$/, 'ABN must be 11 digits'),
  acn: z.string().optional(),
  addressStreet: z.string().optional(),
  addressSuburb: z.string().optional(),
  addressState: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),
  addressPostcode: z.string().optional(),
  defaultPayFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']).default('WEEKLY'),
  payrollContactName: z.string().optional(),
  payrollContactEmail: z.string().email().optional(),
  payrollContactPhone: z.string().optional(),
})

export const createDepotSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).toUpperCase(),
  addressStreet: z.string().optional(),
  addressSuburb: z.string().optional(),
  addressState: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),
  addressPostcode: z.string().optional(),
})

export async function getCompaniesForOrg(organizationId: string) {
  return prisma.company.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      depots: { where: { deletedAt: null } },
      _count: { select: { employees: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getCompany(id: string, organizationId: string) {
  const company = await prisma.company.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      depots: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
      allowanceTypes: { where: { isActive: true }, orderBy: { name: 'asc' } },
      deductionTypes: { where: { isActive: true }, orderBy: { name: 'asc' } },
    },
  })
  if (!company) throw new NotFoundError('Company')
  return company
}

export async function createCompany(
  organizationId: string,
  data: z.infer<typeof createCompanySchema>,
) {
  return prisma.company.create({
    data: { ...data, organizationId },
  })
}

export async function updateCompany(
  id: string,
  organizationId: string,
  data: Partial<z.infer<typeof createCompanySchema>> & {
    bankBsb?: string
    bankAccount?: string
    bankAccountName?: string
    bankAbbreviation?: string
    bankUserId?: string
  },
) {
  const company = await prisma.company.findFirst({ where: { id, organizationId, deletedAt: null } })
  if (!company) throw new NotFoundError('Company')

  const { bankAccount, ...rest } = data
  return prisma.company.update({
    where: { id },
    data: {
      ...rest,
      ...(bankAccount !== undefined ? { bankAccount: encrypt(bankAccount) } : {}),
    },
  })
}

export async function createDepot(
  companyId: string,
  organizationId: string,
  data: z.infer<typeof createDepotSchema>,
) {
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId } })
  if (!company) throw new NotFoundError('Company')

  return prisma.depot.create({ data: { ...data, companyId } })
}

export async function getDepots(companyId: string) {
  return prisma.depot.findMany({
    where: { companyId, deletedAt: null },
    include: { _count: { select: { employees: { where: { isActive: true } } } } },
    orderBy: { name: 'asc' },
  })
}

// ─── User access management ───────────────────────────────────────────────────

export async function getCompanyUsers(companyId: string) {
  const [access, depots] = await Promise.all([
    prisma.userCompanyAccess.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, lastLoginAt: true, isActive: true } },
      },
      orderBy: [{ role: 'asc' }, { user: { lastName: 'asc' } }],
    }),
    prisma.depot.findMany({ where: { companyId, deletedAt: null }, select: { id: true, name: true } }),
  ])

  const depotMap = new Map(depots.map(d => [d.id, d.name]))

  return access.map(a => ({
    accessId: a.id,
    id: a.user.id,
    firstName: a.user.firstName,
    lastName: a.user.lastName,
    email: a.user.email,
    isActive: a.user.isActive,
    lastLoginAt: a.user.lastLoginAt,
    role: a.role,
    depotId: a.depotId,
    depotName: a.depotId ? (depotMap.get(a.depotId) ?? null) : null,
    enabledPages: a.enabledPages,
  }))
}

export const updateUserAccessSchema = z.object({
  role: z.enum(['COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR', 'EMPLOYEE']).optional(),
  depotId: z.string().nullable().optional(),
  enabledPages: z.array(z.string()).optional(),
})

export async function updateUserAccess(
  companyId: string,
  userId: string,
  data: z.infer<typeof updateUserAccessSchema>,
) {
  const existing = await prisma.userCompanyAccess.findUnique({
    where: { userId_companyId: { userId, companyId } },
  })
  if (!existing) throw new NotFoundError('User access record')

  return prisma.userCompanyAccess.update({
    where: { userId_companyId: { userId, companyId } },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.depotId !== undefined ? { depotId: data.depotId } : {}),
      ...(data.enabledPages !== undefined ? { enabledPages: data.enabledPages } : {}),
    },
  })
}

export async function seedDefaultAllowances(companyId: string) {
  const defaults = [
    { code: 'MEAL', name: 'Meal Allowance', isTaxable: true, stpCategory: 'MealAllowance', defaultAmount: 17.03 },
    { code: 'OVERNIGHT', name: 'Overnight / Away From Base', isTaxable: false, stpCategory: 'Accommodation', defaultAmount: 131.00, isPerDiem: true },
    { code: 'DG', name: 'Dangerous Goods Allowance', isTaxable: true, stpCategory: 'OtherAllowance', defaultAmount: 0.83 },
    { code: 'MULTIDROP', name: 'Multi-Drop Allowance', isTaxable: true, stpCategory: 'OtherAllowance', defaultAmount: 2.89 },
    { code: 'WET', name: 'Wet Weather Allowance', isTaxable: true, stpCategory: 'OtherAllowance', defaultAmount: 0.83 },
    { code: 'TOOL', name: 'Tool Allowance', isTaxable: true, stpCategory: 'ToolAllowance', defaultAmount: 15.02 },
    { code: 'FATIGUE', name: 'Fatigue Management Allowance', isTaxable: true, stpCategory: 'OtherAllowance' },
  ]

  const deductions = [
    { code: 'UNION', name: 'Union Fees', isPreTax: false, stpCategory: 'UnionFees' },
    { code: 'SALARY_SAC', name: 'Salary Sacrifice', isPreTax: true, stpCategory: 'SalarySacrifice' },
    { code: 'NOVATED', name: 'Novated Lease', isPreTax: true, stpCategory: 'NovatedLease' },
    { code: 'CHILD_SUP', name: 'Child Support Garnishee', isPreTax: false, stpCategory: 'ChildSupport' },
    { code: 'UNIFORM', name: 'Uniform / PPE', isPreTax: false, stpCategory: 'OtherDeduction' },
    { code: 'INSURANCE', name: 'Insurance', isPreTax: false, stpCategory: 'OtherDeduction' },
  ]

  await prisma.$transaction([
    ...defaults.map(d =>
      prisma.allowanceType.upsert({
        where: { companyId_code: { companyId, code: d.code } },
        create: { ...d, companyId },
        update: {},
      }),
    ),
    ...deductions.map(d =>
      prisma.deductionType.upsert({
        where: { companyId_code: { companyId, code: d.code } },
        create: { ...d, companyId },
        update: {},
      }),
    ),
  ])
}
