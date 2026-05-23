import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { NotFoundError } from '../../middleware/error.middleware.js'
import { sendEmail, complianceAlertEmail, type ComplianceAlertItem } from '../../lib/email.js'
import { logger } from '../../lib/logger.js'

export const licenceSchema = z.object({
  licenceNumber: z.string().min(1),
  licenceState: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  licenceClasses: z.array(z.enum(['C', 'LR', 'MR', 'HR', 'HC', 'MC'])),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  restrictions: z.string().optional(),
})

export const accreditationSchema = z.object({
  accreditationType: z.enum([
    'DANGEROUS_GOODS', 'HEAVY_VEHICLE_MASS_MANAGEMENT', 'HEAVY_VEHICLE_MAINTENANCE',
    'BASIC_FATIGUE_MANAGEMENT', 'ADVANCED_FATIGUE_MANAGEMENT', 'FORKLIFT',
    'FIRST_AID', 'WHITE_CARD', 'OTHER',
  ]),
  certificateNumber: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  issuingBody: z.string().optional(),
})

export const medicalCertSchema = z.object({
  certType: z.enum(['COMMERCIAL_VEHICLE_DRIVER', 'DANGEROUS_GOODS_DRIVER', 'ANNUAL_MEDICAL']),
  issuingDoctor: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  restrictions: z.string().optional(),
})

// ─── Licences ────────────────────────────────────────────────────────────────

export async function addLicence(
  employeeId: string,
  companyId: string,
  data: z.infer<typeof licenceSchema>,
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } })
  if (!employee) throw new NotFoundError('Employee')

  // Deactivate previous licence
  await prisma.driverLicence.updateMany({
    where: { employeeId, isActive: true },
    data: { isActive: false },
  })

  return prisma.driverLicence.create({
    data: {
      employeeId,
      licenceNumber: data.licenceNumber,
      licenceState: data.licenceState,
      licenceClasses: data.licenceClasses,
      issueDate: new Date(data.issueDate),
      expiryDate: new Date(data.expiryDate),
      restrictions: data.restrictions,
    },
  })
}

export async function addAccreditation(
  employeeId: string,
  companyId: string,
  data: z.infer<typeof accreditationSchema>,
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } })
  if (!employee) throw new NotFoundError('Employee')

  return prisma.accreditation.create({
    data: {
      employeeId,
      accreditationType: data.accreditationType,
      certificateNumber: data.certificateNumber,
      issueDate: new Date(data.issueDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      issuingBody: data.issuingBody,
    },
  })
}

export async function addMedicalCert(
  employeeId: string,
  companyId: string,
  data: z.infer<typeof medicalCertSchema>,
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } })
  if (!employee) throw new NotFoundError('Employee')

  // Deactivate previous cert of same type
  await prisma.medicalCertificate.updateMany({
    where: { employeeId, certType: data.certType, isActive: true },
    data: { isActive: false },
  })

  return prisma.medicalCertificate.create({
    data: {
      employeeId,
      certType: data.certType,
      issuingDoctor: data.issuingDoctor,
      issueDate: new Date(data.issueDate),
      expiryDate: new Date(data.expiryDate),
      restrictions: data.restrictions,
    },
  })
}

// ─── Expiry dashboard ────────────────────────────────────────────────────────

/**
 * Returns all licences, accreditations, and medicals expiring within X days.
 * Used for the compliance dashboard and automated alert generation.
 */
export async function getExpiryAlerts(
  companyId: string,
  daysAhead = 90,
) {
  const alertDate = new Date()
  alertDate.setDate(alertDate.getDate() + daysAhead)
  const today = new Date()

  const [licences, accreditations, medicals] = await Promise.all([
    prisma.driverLicence.findMany({
      where: {
        isActive: true,
        expiryDate: { lte: alertDate },
        employee: { companyId, isActive: true },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { expiryDate: 'asc' },
    }),
    prisma.accreditation.findMany({
      where: {
        isActive: true,
        expiryDate: { not: null, lte: alertDate },
        employee: { companyId, isActive: true },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { expiryDate: 'asc' },
    }),
    prisma.medicalCertificate.findMany({
      where: {
        isActive: true,
        expiryDate: { lte: alertDate },
        employee: { companyId, isActive: true },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { expiryDate: 'asc' },
    }),
  ])

  const addAlertLevel = <T extends { expiryDate: Date | null }>(items: T[]) =>
    items.map(item => ({
      ...item,
      daysUntilExpiry: item.expiryDate
        ? Math.ceil((item.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      alertLevel: item.expiryDate
        ? item.expiryDate < today
          ? 'EXPIRED'
          : item.expiryDate <= new Date(today.getTime() + 30 * 86400000)
          ? 'CRITICAL'
          : item.expiryDate <= new Date(today.getTime() + 60 * 86400000)
          ? 'WARNING'
          : 'NOTICE'
        : 'NOTICE',
    }))

  return {
    licences: addAlertLevel(licences),
    accreditations: addAlertLevel(accreditations),
    medicals: addAlertLevel(medicals),
  }
}

// ─── Compliance expiry email alerts ─────────────────────────────────────────
// Sends one digest email to all COMPANY_ADMIN users for the company listing
// every licence, accreditation, and medical cert expiring within 90 days.
// Called daily by the scheduler in index.ts; can also be triggered manually.

export async function sendExpiryAlertEmails(companyId: string): Promise<{ sent: number; skipped: string }> {
  // Load company + admin emails
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      userAccess: {
        where: { role: 'COMPANY_ADMIN' },
        select: { user: { select: { email: true, isActive: true } } },
      },
    },
  })
  if (!company) return { sent: 0, skipped: 'Company not found' }

  const adminEmails = company.userAccess
    .filter(ua => ua.user.isActive && ua.user.email)
    .map(ua => ua.user.email as string)

  if (adminEmails.length === 0) return { sent: 0, skipped: 'No active admin emails' }

  // Get expiry data
  const alerts = await getExpiryAlerts(companyId, 90)

  // Normalise all three document types into a flat list with a label
  const normalise = (
    items: Array<{ employee: { firstName: string; lastName: string; employeeNumber: string }; expiryDate: Date | null; daysUntilExpiry: number | null; alertLevel: string }>,
    makeLabel: (item: typeof items[number]) => string,
  ): ComplianceAlertItem[] =>
    items.map(item => ({
      employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
      employeeNumber: item.employee.employeeNumber,
      documentType: makeLabel(item),
      expiryDate: item.expiryDate,
      daysUntilExpiry: item.daysUntilExpiry,
    }))

  const licenceItems = normalise(
    alerts.licences as any,
    (l: any) => `Licence (${(l.licenceClasses as string[]).join('/')})`,
  )
  const accredItems = normalise(
    alerts.accreditations as any,
    (a: any) => (a.accreditationType as string).replace(/_/g, ' '),
  )
  const medicalItems = normalise(
    alerts.medicals as any,
    (m: any) => (m.certType as string).replace(/_/g, ' '),
  )

  const all = [...licenceItems, ...accredItems, ...medicalItems]
  if (all.length === 0) return { sent: 0, skipped: 'No expiring items' }

  const bucket = (level: string) => all.filter(item => {
    const days = item.daysUntilExpiry
    if (level === 'expired')  return days !== null && days < 0
    if (level === 'critical') return days !== null && days >= 0 && days <= 30
    if (level === 'warning')  return days !== null && days > 30 && days <= 60
    if (level === 'notice')   return days !== null && days > 60
    return false
  })

  const emailTemplate = complianceAlertEmail({
    companyName: company.name,
    expired:  bucket('expired'),
    critical: bucket('critical'),
    warning:  bucket('warning'),
    notice:   bucket('notice'),
  })

  let sent = 0
  for (const email of adminEmails) {
    await sendEmail({ ...emailTemplate, to: email })
    sent++
  }

  return { sent, skipped: '' }
}

export async function sendAllComplianceAlerts(): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  })

  for (const company of companies) {
    try {
      const result = await sendExpiryAlertEmails(company.id)
      if (result.sent > 0) {
        logger.info(`Compliance alerts sent for ${company.name}: ${result.sent} email(s)`)
      }
    } catch (err) {
      logger.error(`Failed to send compliance alerts for company ${company.id}`, { error: err })
    }
  }
}

// ─── Fatigue tracking ────────────────────────────────────────────────────────

export async function recordFatigueEntry(
  companyId: string,
  data: {
    employeeId: string
    workStartTime: string
    workEndTime: string
    locationStart?: string
    locationEnd?: string
    fatigueScheme?: string
    notes?: string
  },
) {
  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, companyId } })
  if (!employee) throw new NotFoundError('Employee')

  const workStart = new Date(data.workStartTime)
  const workEnd = new Date(data.workEndTime)
  const workMinutes = (workEnd.getTime() - workStart.getTime()) / 60000

  // Standard hours check: max 12 hours work in 24-hour period
  const isCompliant = workMinutes <= 720 // 12 hours
  const violationType = !isCompliant ? 'EXCEEDED_12_HOUR_LIMIT' : undefined

  return prisma.fatigueRecord.create({
    data: {
      employeeId: data.employeeId,
      recordDate: workStart,
      workStartTime: workStart,
      workEndTime: workEnd,
      workMinutes: Math.round(workMinutes),
      locationStart: data.locationStart,
      locationEnd: data.locationEnd,
      fatigueScheme: (data.fatigueScheme as any) ?? 'STANDARD_HOURS',
      isCompliant,
      violationType,
      notes: data.notes,
    },
  })
}

export async function getFatigueReport(
  companyId: string,
  startDate: Date,
  endDate: Date,
) {
  return prisma.fatigueRecord.findMany({
    where: {
      recordDate: { gte: startDate, lte: endDate },
      employee: { companyId },
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
    },
    orderBy: [{ employee: { lastName: 'asc' } }, { recordDate: 'asc' }],
  })
}
