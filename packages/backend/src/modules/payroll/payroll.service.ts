// ─────────────────────────────────────────────────────────────────
// Payroll service — orchestrates the pay run lifecycle
// ─────────────────────────────────────────────────────────────────

import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { uploadFile } from '../../lib/storage.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'
import { decrypt, decryptOptional } from '../../lib/crypto.js'
import { calculateTax } from './engines/tax.engine.js'
import { calculateSuper } from './engines/super.engine.js'
import { generateABAFile } from './generators/aba.generator.js'
import { generatePayslipPDF } from './generators/payslip.generator.js'
import { generateSTPPayEventPayload } from './generators/stp.generator.js'
import { PENALTY_RATES, formatCurrency, getFinancialYearStart } from '@freight-payroll/shared'
import { processLeaveAccruals } from '../leave/leave.service.js'
import type { PayslipData } from '@freight-payroll/shared'
import type { Prisma } from '@prisma/client'

// ──�� Schemas ────────────────────────────────────────────────────────────────

export const createPayRunSchema = z.object({
  payFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeIds: z.array(z.string()).optional(), // if omitted, include all active employees
})

// ─── Create pay run ──────────────────────────────────────────────────────────

export async function createPayRun(
  companyId: string,
  data: z.infer<typeof createPayRunSchema>,
  createdBy: string,
) {
  const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } })
  if (!company) throw new NotFoundError('Company')

  // Check for overlapping pay run
  const overlap = await prisma.payRun.findFirst({
    where: {
      companyId,
      payFrequency: data.payFrequency,
      periodStartDate: { lte: new Date(data.periodEndDate) },
      periodEndDate: { gte: new Date(data.periodStartDate) },
      status: { notIn: ['CANCELLED'] },
    },
  })
  if (overlap) {
    throw new AppError(409, `A ${data.payFrequency.toLowerCase()} pay run already exists for this period`)
  }

  const payRun = await prisma.payRun.create({
    data: {
      companyId,
      payFrequency: data.payFrequency,
      periodStartDate: new Date(data.periodStartDate),
      periodEndDate: new Date(data.periodEndDate),
      payDate: new Date(data.payDate),
      status: 'DRAFT',
      createdBy,
    },
  })

  // Populate with employees
  await populatePayRunItems(payRun.id, companyId, data.employeeIds)

  return getPayRun(payRun.id, companyId)
}

export async function getPayRun(id: string, companyId: string) {
  const payRun = await prisma.payRun.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              payFrequency: true,
              employmentType: true,
            },
          },
          earnings: true,
          allowances: { include: { allowanceType: true } },
          deductions: { include: { deductionType: true } },
          leaveItems: true,
        },
      },
    },
  })
  if (!payRun) throw new NotFoundError('Pay run')
  return payRun
}

export async function listPayRuns(companyId: string, page = 1, pageSize = 20) {
  const [payRuns, total] = await Promise.all([
    prisma.payRun.findMany({
      where: { companyId },
      include: { _count: { select: { items: true } } },
      orderBy: { periodStartDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payRun.count({ where: { companyId } }),
  ])

  return { data: payRuns, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// ─── Populate items ──────────────────────────────────────────────────────────

async function populatePayRunItems(
  payRunId: string,
  companyId: string,
  employeeIds?: string[],
) {
  const payRun = await prisma.payRun.findUnique({ where: { id: payRunId } })
  if (!payRun) return

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      deletedAt: null,
      ...(employeeIds ? { id: { in: employeeIds } } : {}),
    },
    include: {
      payRates: {
        where: {
          effectiveTo: null,
          effectiveFrom: { lte: payRun.periodEndDate },
        },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
      awardClassifications: {
        where: { effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  })

  for (const employee of employees) {
    // Find approved timesheets for this period
    const timesheets = await prisma.timesheet.findMany({
      where: {
        employeeId: employee.id,
        weekStartDate: { gte: payRun.periodStartDate },
        weekEndDate: { lte: payRun.periodEndDate },
        status: 'APPROVED',
      },
      include: { entries: { include: { breaks: true } } },
    })

    await calculateAndCreatePayRunItem(payRun, employee, timesheets)
  }

  // Recalculate pay run totals
  await recalculatePayRunTotals(payRunId)
}

async function calculateAndCreatePayRunItem(
  payRun: Awaited<ReturnType<typeof prisma.payRun.findUnique>> & {},
  employee: any,
  timesheets: any[],
) {
  if (!payRun) return

  const payRate = employee.payRates[0]
  if (!payRate) return // Skip employees with no pay rate configured

  // Aggregate hours from approved timesheets
  let totalOrdinaryHours = 0
  let totalOvertimeHours = 0

  for (const ts of timesheets) {
    totalOrdinaryHours += Number(ts.totalOrdinaryHours)
    totalOvertimeHours += Number(ts.totalOvertimeHours)
  }

  // Calculate earnings based on pay type
  let ordinaryEarnings = 0
  let overtimeEarnings = 0
  const earningLines: Array<{
    earningType: any
    description: string
    hours?: number
    rate?: number
    amount: number
  }> = []

  const hourlyRate = Number(payRate.hourlyRate ?? 0)

  if (payRate.payType === 'HOURLY' && hourlyRate > 0) {
    ordinaryEarnings = totalOrdinaryHours * hourlyRate
    overtimeEarnings = totalOvertimeHours * hourlyRate * PENALTY_RATES.overtime_first_3_hours

    if (totalOrdinaryHours > 0) {
      earningLines.push({
        earningType: 'ORDINARY',
        description: 'Ordinary Time',
        hours: totalOrdinaryHours,
        rate: hourlyRate,
        amount: ordinaryEarnings,
      })
    }
    if (totalOvertimeHours > 0) {
      earningLines.push({
        earningType: 'OVERTIME_1_5X',
        description: 'Overtime (1.5x)',
        hours: totalOvertimeHours,
        rate: hourlyRate * 1.5,
        amount: overtimeEarnings,
      })
    }
  }

  const grossEarnings = ordinaryEarnings + overtimeEarnings

  // Tax calculation
  const taxResult = calculateTax({
    periodGrossEarnings: grossEarnings,
    preTaxDeductions: 0,
    payFrequency: employee.payFrequency,
    taxResidencyStatus: employee.taxResidencyStatus,
    claimsTaxFreeThreshold: employee.claimsTaxFreeThreshold,
    hasHECSDebt: employee.hasHECSDebt,
    hasSFSSDebt: employee.hasSFSSDebt,
    hasTFN: !!employee.taxFileNumber,
  })

  // Super
  const superResult = calculateSuper({
    ordinaryTimeEarnings: ordinaryEarnings,
    overtimeEarnings: overtimeEarnings,
    leavePaid: 0,
    payDate: payRun.payDate,
  })

  const netPay = grossEarnings - taxResult.paygWithholding

  // YTD figures
  const fyStart = getFinancialYearStart(payRun.payDate)
  const ytd = await prisma.payRunItem.aggregate({
    where: {
      employeeId: employee.id,
      payRun: {
        companyId: payRun.companyId,
        payDate: { gte: fyStart },
        status: 'FINALISED',
      },
    },
    _sum: { grossEarnings: true, paygWithholding: true, superGuarantee: true },
  })

  const ytdGross = Number(ytd._sum.grossEarnings ?? 0) + grossEarnings
  const ytdTax = Number(ytd._sum.paygWithholding ?? 0) + taxResult.paygWithholding
  const ytdSuper = Number(ytd._sum.superGuarantee ?? 0) + superResult.superGuarantee

  await prisma.payRunItem.create({
    data: {
      payRunId: payRun.id,
      employeeId: employee.id,
      ordinaryEarnings,
      overtimeEarnings,
      grossEarnings,
      taxableIncome: taxResult.taxableIncome,
      paygWithholding: taxResult.paygWithholding,
      superGuarantee: superResult.superGuarantee,
      netPay,
      ordinaryHours: totalOrdinaryHours,
      overtimeHours: totalOvertimeHours,
      ytdGross,
      ytdTax,
      ytdSuper,
      earnings: {
        create: earningLines,
      },
    },
  })
}

async function recalculatePayRunTotals(payRunId: string) {
  const totals = await prisma.payRunItem.aggregate({
    where: { payRunId },
    _sum: {
      grossEarnings: true,
      paygWithholding: true,
      superGuarantee: true,
      postTaxDeductions: true,
      netPay: true,
    },
    _count: { id: true },
  })

  await prisma.payRun.update({
    where: { id: payRunId },
    data: {
      totalGross: totals._sum.grossEarnings ?? 0,
      totalTax: totals._sum.paygWithholding ?? 0,
      totalSuper: totals._sum.superGuarantee ?? 0,
      totalDeductions: totals._sum.postTaxDeductions ?? 0,
      totalNet: totals._sum.netPay ?? 0,
      totalEmployeeCount: totals._count.id,
    },
  })
}

// ─── Finalise pay run ────────────────────────────────────────────────────────

export async function finalisePayRun(
  payRunId: string,
  companyId: string,
  finalisedBy: string,
) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: payRunId, companyId, status: { in: ['DRAFT', 'PREVIEW', 'APPROVED'] } },
  })
  if (!payRun) throw new NotFoundError('Pay run')

  await prisma.payRun.update({
    where: { id: payRunId },
    data: { status: 'FINALISED', finalisedAt: new Date(), finalisedBy },
  })

  await prisma.payRunItem.updateMany({
    where: { payRunId },
    data: { status: 'FINALISED' },
  })

  // Accrue leave for all active employees in this company for the pay period
  await processLeaveAccruals(
    companyId,
    payRun.periodStartDate,
    payRun.periodEndDate,
    payRun.payFrequency,
  )

  return getPayRun(payRunId, companyId)
}

// ─── Generate ABA file ───────────────────────────────────────────────────────

export async function generateABA(payRunId: string, companyId: string): Promise<string> {
  const payRun = await prisma.payRun.findFirst({
    where: { id: payRunId, companyId, status: 'FINALISED' },
    include: {
      company: true,
      items: {
        include: {
          employee: {
            include: { bankAccounts: { where: { isPrimary: true } } },
          },
        },
      },
    },
  })
  if (!payRun) throw new NotFoundError('Finalised pay run')

  const company = payRun.company
  if (!company.bankBsb || !company.bankAccount || !company.bankAbbreviation || !company.bankUserId) {
    throw new AppError(400, 'Company bank details are incomplete. Configure BSB, account, bank abbreviation, and user ID.')
  }

  const payments = payRun.items
    .filter(item => item.employee.bankAccounts.length > 0)
    .map(item => {
      const bank = item.employee.bankAccounts[0]
      return {
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        bsb: decrypt(bank.bsb),
        accountNumber: decrypt(bank.accountNumber),
        amount: Number(item.netPay),
        reference: `${payRun.payDate.toLocaleDateString('en-AU').replace(/\//g, '')} PAYROLL`,
      }
    })

  const abaContent = generateABAFile(
    {
      bsb: company.bankBsb,
      accountNumber: decrypt(company.bankAccount!),
      bankAbbreviation: company.bankAbbreviation,
      userId: company.bankUserId,
      companyName: company.name.slice(0, 26),
      description: 'PAYROLL',
      processDate: payRun.payDate,
    },
    payments,
  )

  const key = `aba/${payRunId}-${Date.now()}.aba`
  await uploadFile({ key, body: abaContent, contentType: 'text/plain' })

  await prisma.payRun.update({
    where: { id: payRunId },
    data: { abaFileKey: key, abaGeneratedAt: new Date() },
  })

  return key
}

// ─── Generate payslips ───────────────────────────────────────────────────────

export async function generatePayslips(
  payRunId: string,
  companyId: string,
): Promise<void> {
  const payRun = await prisma.payRun.findFirst({
    where: { id: payRunId, companyId },
    include: {
      company: true,
      items: {
        include: {
          employee: { include: { leaveBalances: true } },
          earnings: true,
          allowances: { include: { allowanceType: true } },
          deductions: { include: { deductionType: true } },
          leaveItems: true,
        },
      },
    },
  })
  if (!payRun) throw new NotFoundError('Pay run')

  for (const item of payRun.items) {
    const payslipData: PayslipData = {
      employee: {
        name: `${item.employee.firstName} ${item.employee.lastName}`,
        employeeNumber: item.employee.employeeNumber,
        position: item.employee.employmentType,
        payFrequency: item.employee.payFrequency,
        superFund: item.employee.superFundName ?? undefined,
        superMemberNumber: item.employee.superMemberNumber ?? undefined,
      },
      company: {
        name: payRun.company.name,
        abn: payRun.company.abn,
        address: [
          payRun.company.addressStreet,
          payRun.company.addressSuburb,
          payRun.company.addressState,
          payRun.company.addressPostcode,
        ]
          .filter(Boolean)
          .join(', '),
      },
      period: {
        startDate: payRun.periodStartDate.toLocaleDateString('en-AU'),
        endDate: payRun.periodEndDate.toLocaleDateString('en-AU'),
        payDate: payRun.payDate.toLocaleDateString('en-AU'),
      },
      earnings: item.earnings.map(e => ({
        description: e.description,
        hours: e.hours ? Number(e.hours) : undefined,
        rate: e.rate ? Number(e.rate) : undefined,
        amount: Number(e.amount),
      })),
      allowances: item.allowances.map(a => ({
        description: a.allowanceType.name,
        units: a.units ? Number(a.units) : undefined,
        amount: Number(a.amount),
        isTaxable: a.allowanceType.isTaxable,
      })),
      deductions: item.deductions.map(d => ({
        description: d.deductionType.name,
        amount: Number(d.amount),
      })),
      leaveItems: item.leaveItems.map(l => ({
        description: `${l.leaveType} Leave`,
        hours: Number(l.hours),
        amount: Number(l.amount),
      })),
      summary: {
        grossEarnings: Number(item.grossEarnings),
        preTaxDeductions: Number(item.preTaxDeductions),
        taxableIncome: Number(item.taxableIncome),
        paygWithholding: Number(item.paygWithholding),
        postTaxDeductions: Number(item.postTaxDeductions),
        netPay: Number(item.netPay),
        superGuarantee: Number(item.superGuarantee),
      },
      ytd: {
        grossEarnings: Number(item.ytdGross),
        tax: Number(item.ytdTax),
        super: Number(item.ytdSuper),
      },
      leaveBalances: item.employee.leaveBalances
        .filter(lb => ['ANNUAL', 'PERSONAL_CARERS', 'LONG_SERVICE'].includes(lb.leaveType))
        .map(lb => ({
          leaveType: lb.leaveType,
          balance: Number(lb.balance),
          unit: 'hours' as const,
        })),
    }

    const pdfBuffer = await generatePayslipPDF(payslipData)
    const key = `payslips/${payRunId}/${item.employeeId}.pdf`
    await uploadFile({ key, body: pdfBuffer, contentType: 'application/pdf' })

    await prisma.payRunItem.update({
      where: { id: item.id },
      data: { payslipFileKey: key, payslipGeneratedAt: new Date() },
    })
  }
}

// ─── STP payload ─────────────────────────────────────────────────────────────

export async function generateSTPPayload(
  payRunId: string,
  companyId: string,
): Promise<object> {
  const payRun = await prisma.payRun.findFirst({
    where: { id: payRunId, companyId, status: 'FINALISED' },
    include: {
      company: true,
      items: {
        include: {
          employee: true,
          allowances: { include: { allowanceType: true } },
          deductions: { include: { deductionType: true } },
        },
      },
    },
  })
  if (!payRun) throw new NotFoundError('Finalised pay run')

  const company = payRun.company

  const events = payRun.items.map(item => ({
    employee: {
      tfn: decryptOptional(item.employee.taxFileNumber) ?? undefined,
      firstName: item.employee.firstName,
      familyName: item.employee.lastName,
      dateOfBirth: item.employee.dateOfBirth?.toISOString().split('T')[0],
      employeeId: item.employee.id,
      startDate: item.employee.startDate.toISOString().split('T')[0],
      taxScale: mapTaxScale(item.employee.taxResidencyStatus, item.employee.claimsTaxFreeThreshold, !!item.employee.taxFileNumber) as import('./generators/stp.generator.js').STPTaxScale,
      claimsTaxFreeThreshold: item.employee.claimsTaxFreeThreshold,
      superFundAbn: item.employee.superFundAbn ?? undefined,
      superFundUsi: item.employee.superFundUsi ?? undefined,
      superMemberNumber: item.employee.superMemberNumber ?? undefined,
    },
    payEvent: {
      employeeId: item.employee.id,
      paymentDate: payRun.payDate.toISOString().split('T')[0],
      payPeriodFrom: payRun.periodStartDate.toISOString().split('T')[0],
      payPeriodTo: payRun.periodEndDate.toISOString().split('T')[0],
      grossEarnings: Number(item.grossEarnings),
      allowances: item.allowances.map(a => ({
        type: a.allowanceType.stpCategory ?? 'OtherAllowance',
        description: a.allowanceType.name,
        amount: Number(a.amount),
        ytdAmount: Number(a.amount), // TODO: accumulate YTD
      })),
      deductions: item.deductions.map(d => ({
        type: d.deductionType.stpCategory ?? 'OtherDeduction',
        description: d.deductionType.name,
        amount: Number(d.amount),
        ytdAmount: Number(d.amount),
      })),
      paygWithholding: Number(item.paygWithholding),
      superGuarantee: Number(item.superGuarantee),
      ytdGross: Number(item.ytdGross),
      ytdPAYG: Number(item.ytdTax),
      ytdSuper: Number(item.ytdSuper),
    },
  }))

  return generateSTPPayEventPayload(
    company.abn,
    company.stpBranchNumber,
    company.stpSoftwareId ?? 'FREIGHT_PAYROLL_V1',
    events,
  )
}

function mapTaxScale(
  residency: string,
  claimsTFT: boolean,
  hasTFN: boolean,
): string {
  if (!hasTFN) return 'SCALE_4'
  if (residency === 'FOREIGN_RESIDENT') return 'SCALE_3'
  if (residency === 'WORKING_HOLIDAY_MAKER') return 'SCALE_6'
  return claimsTFT ? 'SCALE_1' : 'SCALE_2'
}
