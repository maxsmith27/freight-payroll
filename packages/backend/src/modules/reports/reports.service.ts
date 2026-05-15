import prisma from '../../lib/prisma.js'
import { getFinancialYearStart } from '@freight-payroll/shared'

// ─── Payroll summary report ──────────────────────────────────────────────────

export async function getPayrollSummaryReport(
  companyId: string,
  startDate: Date,
  endDate: Date,
) {
  const payRuns = await prisma.payRun.findMany({
    where: {
      companyId,
      payDate: { gte: startDate, lte: endDate },
      status: 'FINALISED',
    },
    include: { _count: { select: { items: true } } },
    orderBy: { payDate: 'asc' },
  })

  const totals = payRuns.reduce(
    (acc, pr) => ({
      gross: acc.gross + Number(pr.totalGross),
      tax: acc.tax + Number(pr.totalTax),
      super: acc.super + Number(pr.totalSuper),
      net: acc.net + Number(pr.totalNet),
    }),
    { gross: 0, tax: 0, super: 0, net: 0 },
  )

  return { payRuns, totals }
}

// ─── Employee payroll detail report ─────────────────────────────────────────

export async function getEmployeePayrollDetail(
  companyId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date,
) {
  return prisma.payRunItem.findMany({
    where: {
      employeeId,
      payRun: { companyId, payDate: { gte: startDate, lte: endDate }, status: 'FINALISED' },
    },
    include: {
      payRun: { select: { payDate: true, periodStartDate: true, periodEndDate: true } },
      earnings: true,
      allowances: { include: { allowanceType: true } },
      deductions: { include: { deductionType: true } },
    },
    orderBy: { payRun: { payDate: 'asc' } },
  })
}

// ─── Superannuation contribution report ─────────────────────────────────────

export async function getSuperReport(
  companyId: string,
  startDate: Date,
  endDate: Date,
) {
  const items = await prisma.payRunItem.findMany({
    where: {
      payRun: { companyId, payDate: { gte: startDate, lte: endDate }, status: 'FINALISED' },
      superGuarantee: { gt: 0 },
    },
    include: {
      employee: {
        select: {
          firstName: true, lastName: true, employeeNumber: true,
          superFundName: true, superFundAbn: true, superMemberNumber: true, superFundUsi: true,
        },
      },
      payRun: { select: { payDate: true } },
    },
    orderBy: [{ employee: { lastName: 'asc' } }, { payRun: { payDate: 'asc' } }],
  })

  // Group by employee
  const byEmployee = new Map<string, { employee: any; total: number; contributions: any[] }>()
  for (const item of items) {
    const key = item.employeeId
    if (!byEmployee.has(key)) {
      byEmployee.set(key, { employee: item.employee, total: 0, contributions: [] })
    }
    const emp = byEmployee.get(key)!
    emp.total += Number(item.superGuarantee)
    emp.contributions.push({ payDate: item.payRun.payDate, amount: Number(item.superGuarantee) })
  }

  return Array.from(byEmployee.values())
}

// ─── Leave liability report ───────────────────────────────────────────────────

export async function getLeaveLiabilityReport(companyId: string) {
  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true, deletedAt: null },
    include: {
      payRates: { where: { effectiveTo: null }, take: 1, orderBy: { effectiveFrom: 'desc' } },
      leaveBalances: true,
    },
  })

  return employees.map(emp => {
    const hourlyRate = Number(emp.payRates[0]?.hourlyRate ?? 0)
    const weeklyRate = hourlyRate * 38

    const annualBalance = emp.leaveBalances.find(b => b.leaveType === 'ANNUAL')
    const personalBalance = emp.leaveBalances.find(b => b.leaveType === 'PERSONAL_CARERS')
    const lslBalance = emp.leaveBalances.find(b => b.leaveType === 'LONG_SERVICE')

    const annualHours = Number(annualBalance?.balance ?? 0)
    const annualLoading = annualHours * hourlyRate * 0.175

    return {
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      name: `${emp.firstName} ${emp.lastName}`,
      annualLeaveHours: annualHours,
      annualLeaveDollarValue: annualHours * hourlyRate,
      annualLeaveLoading: annualLoading,
      personalLeaveHours: Number(personalBalance?.balance ?? 0),
      personalLeaveDollarValue: Number(personalBalance?.balance ?? 0) * hourlyRate,
      lslHours: Number(lslBalance?.balance ?? 0),
      lslDollarValue: Number(lslBalance?.balance ?? 0) * hourlyRate,
      totalLiability:
        annualHours * hourlyRate +
        annualLoading +
        Number(personalBalance?.balance ?? 0) * hourlyRate +
        Number(lslBalance?.balance ?? 0) * hourlyRate,
    }
  })
}

// ─── Headcount report ────────────────────────────────────────────────────────

export async function getHeadcountReport(companyId: string) {
  const [byType, byDepot, total] = await Promise.all([
    prisma.employee.groupBy({
      by: ['employmentType'],
      where: { companyId, isActive: true, deletedAt: null },
      _count: { id: true },
    }),
    prisma.employee.groupBy({
      by: ['depotId'],
      where: { companyId, isActive: true, deletedAt: null },
      _count: { id: true },
    }),
    prisma.employee.count({ where: { companyId, isActive: true, deletedAt: null } }),
  ])

  return { total, byEmploymentType: byType, byDepot }
}
