import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../../lib/prisma.js'
import { sendEmail, onboardingInviteEmail } from '../../lib/email.js'
import { encryptOptional, encrypt } from '../../lib/crypto.js'
import { NotFoundError, AppError } from '../../middleware/error.middleware.js'
import { config } from '../../config/index.js'

const TOKEN_EXPIRY_DAYS = 7

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const inviteSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR']).optional(),
  startDate: z.string().optional(),
  awardCode: z.enum(['MA000038', 'MA000039']).optional(),
  depotId: z.string().optional(),
  message: z.string().max(500).optional(),
})

// Data the employee fills in during their onboarding
export const onboardingDataSchema = z.object({
  // Personal
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  addressStreet: z.string().optional(),
  addressSuburb: z.string().optional(),
  addressState: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),
  addressPostcode: z.string().optional(),
  stateOfEmployment: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']).optional(),

  // Tax
  taxFileNumber: z.string().regex(/^\d{9}$/, 'TFN must be 9 digits').optional(),
  taxResidencyStatus: z.enum(['RESIDENT', 'FOREIGN_RESIDENT', 'WORKING_HOLIDAY_MAKER']).default('RESIDENT'),
  claimsTaxFreeThreshold: z.boolean().default(true),
  hasHECSDebt: z.boolean().default(false),
  hasSFSSDebt: z.boolean().default(false),
  // Declaration: employee agrees they have declared their TFN status correctly
  taxDeclarationAgreed: z.boolean().default(false),
  taxDeclarationSignedName: z.string().optional(),

  // Superannuation
  superFundName: z.string().optional(),
  superFundAbn: z.string().optional(),
  superFundUsi: z.string().optional(),
  superMemberNumber: z.string().optional(),
  superChoiceAgreed: z.boolean().default(false),

  // Bank account
  bankBsb: z.string().regex(/^\d{6}$/).optional(),
  bankAccountNumber: z.string().min(5).max(10).optional(),
  bankAccountName: z.string().optional(),

  // Emergency contact
  emergencyName: z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

// ─── Service functions ────────────────────────────────────────────────────────

export async function sendInvite(
  companyId: string,
  invitedBy: string,
  data: z.infer<typeof inviteSchema>,
) {
  // Verify company exists and get company name for the email
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  })
  if (!company) throw new NotFoundError('Company')

  const inviter = await prisma.user.findUnique({
    where: { id: invitedBy },
    select: { firstName: true, lastName: true },
  })

  // Check if this email already has an active invite for this company
  const existing = await prisma.employeeOnboarding.findFirst({
    where: {
      companyId,
      inviteEmail: data.email.toLowerCase(),
      status: { in: ['INVITED', 'IN_PROGRESS', 'PENDING_REVIEW'] },
    },
  })
  if (existing) throw new AppError(409, 'An active onboarding invite already exists for this email address')

  // Check if employee with this email already exists
  const existingEmp = await prisma.employee.findFirst({
    where: { companyId, email: data.email.toLowerCase(), deletedAt: null },
  })
  if (existingEmp) throw new AppError(409, 'An employee with this email already exists')

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS)

  const onboarding = await prisma.employeeOnboarding.create({
    data: {
      companyId,
      inviteEmail: data.email.toLowerCase(),
      token,
      expiresAt,
      status: 'INVITED',
      invitedBy,
      onboardingData: {
        firstName: data.firstName,
        lastName: data.lastName,
        employmentType: data.employmentType,
        startDate: data.startDate,
        awardCode: data.awardCode,
        depotId: data.depotId,
      },
    },
  })

  const inviteUrl = `${config.FRONTEND_URL}/onboard/${token}`
  const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Your employer'

  const email = onboardingInviteEmail({
    companyName: company.name,
    inviterName,
    inviteUrl,
    expiresInDays: TOKEN_EXPIRY_DAYS,
  })
  email.to = data.email

  await sendEmail(email)

  return {
    id: onboarding.id,
    token: onboarding.token,
    inviteEmail: onboarding.inviteEmail,
    expiresAt: onboarding.expiresAt.toISOString(),
    status: onboarding.status,
    inviteUrl,
  }
}

export async function getOnboardingByToken(token: string) {
  const record = await prisma.employeeOnboarding.findUnique({
    where: { token },
    include: {
      company: { select: { name: true, logoKey: true } },
    },
  })

  if (!record) throw new NotFoundError('Onboarding invite')
  if (record.expiresAt < new Date() && record.status === 'INVITED') {
    // Auto-expire
    await prisma.employeeOnboarding.update({ where: { id: record.id }, data: { status: 'EXPIRED' } })
    throw new AppError(410, 'This onboarding link has expired. Please contact your employer for a new invite.')
  }
  if (record.status === 'COMPLETED') {
    throw new AppError(410, 'This onboarding has already been completed. Please log in to your employee portal.')
  }
  if (record.status === 'EXPIRED') {
    throw new AppError(410, 'This onboarding link has expired. Please contact your employer for a new invite.')
  }

  return {
    id: record.id,
    companyName: record.company.name,
    inviteEmail: record.inviteEmail,
    status: record.status,
    existingData: record.onboardingData as Record<string, unknown> | null,
    expiresAt: record.expiresAt.toISOString(),
  }
}

export async function saveOnboardingProgress(
  token: string,
  data: Partial<z.infer<typeof onboardingDataSchema>>,
) {
  const record = await prisma.employeeOnboarding.findUnique({ where: { token } })
  if (!record) throw new NotFoundError('Onboarding invite')
  if (record.status === 'COMPLETED' || record.status === 'EXPIRED') {
    throw new AppError(400, 'This onboarding is no longer active')
  }
  if (record.expiresAt < new Date()) throw new AppError(410, 'This onboarding link has expired')

  const existingData = (record.onboardingData as Record<string, unknown> | null) ?? {}

  await prisma.employeeOnboarding.update({
    where: { id: record.id },
    data: {
      status: 'IN_PROGRESS',
      onboardingData: { ...existingData, ...data },
    },
  })

  return { saved: true }
}

export async function submitOnboarding(token: string, data: z.infer<typeof onboardingDataSchema>) {
  const record = await prisma.employeeOnboarding.findUnique({
    where: { token },
    include: { company: { select: { organizationId: true, name: true } } },
  })
  if (!record) throw new NotFoundError('Onboarding invite')
  if (record.status === 'COMPLETED') throw new AppError(400, 'Already completed')
  if (record.status === 'EXPIRED' || record.expiresAt < new Date()) {
    throw new AppError(410, 'This onboarding link has expired')
  }

  // Save the final data snapshot before creating the employee
  const mergedData = {
    ...((record.onboardingData as Record<string, unknown> | null) ?? {}),
    ...data,
  }

  await prisma.employeeOnboarding.update({
    where: { id: record.id },
    data: {
      onboardingData: mergedData,
      status: 'PENDING_REVIEW',
    },
  })

  return {
    status: 'PENDING_REVIEW',
    message: "Your details have been submitted. Your employer will review and activate your account.",
  }
}

export async function listPendingOnboardings(companyId: string) {
  const records = await prisma.employeeOnboarding.findMany({
    where: {
      companyId,
      status: { in: ['INVITED', 'IN_PROGRESS', 'PENDING_REVIEW'] },
    },
    orderBy: { createdAt: 'desc' },
  })
  return records.map(r => ({
    id: r.id,
    inviteEmail: r.inviteEmail,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    hasSubmitted: r.status === 'PENDING_REVIEW',
    data: r.onboardingData as Record<string, unknown> | null,
  }))
}

export async function activateOnboarding(
  onboardingId: string,
  companyId: string,
  activatedBy: string,
) {
  const record = await prisma.employeeOnboarding.findFirst({
    where: { id: onboardingId, companyId },
    include: { company: { select: { organizationId: true } } },
  })
  if (!record) throw new NotFoundError('Onboarding')
  if (record.status !== 'PENDING_REVIEW') {
    throw new AppError(400, 'This onboarding is not ready to activate — the employee has not submitted their details yet')
  }

  const d = (record.onboardingData ?? {}) as Record<string, unknown>

  // Generate a unique employee number
  const last = await prisma.employee.findFirst({
    where: { companyId },
    orderBy: { employeeNumber: 'desc' },
    select: { employeeNumber: true },
  })
  const nextNum = last?.employeeNumber
    ? String(parseInt(last.employeeNumber.replace(/\D/g, '') || '0', 10) + 1).padStart(4, '0')
    : '0001'

  // Create employee record within a transaction
  const { employee, user } = await prisma.$transaction(async tx => {
    const employee = await tx.employee.create({
      data: {
        companyId,
        employeeNumber: nextNum,
        firstName: (d.firstName as string) ?? record.inviteEmail.split('@')[0],
        lastName: (d.lastName as string) ?? '',
        preferredName: (d.preferredName as string | undefined) || undefined,
        email: record.inviteEmail,
        phone: (d.phone as string | undefined) || undefined,
        mobile: (d.mobile as string | undefined) || undefined,
        dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth as string) : undefined,
        gender: (d.gender as string | undefined) || undefined,
        addressStreet: (d.addressStreet as string | undefined) || undefined,
        addressSuburb: (d.addressSuburb as string | undefined) || undefined,
        addressState: (d.addressState as any) || undefined,
        addressPostcode: (d.addressPostcode as string | undefined) || undefined,
        stateOfEmployment: (d.stateOfEmployment as any) || undefined,
        taxFileNumber: d.taxFileNumber ? encryptOptional(d.taxFileNumber as string) : undefined,
        taxResidencyStatus: ((d.taxResidencyStatus as any) || 'RESIDENT') as any,
        claimsTaxFreeThreshold: (d.claimsTaxFreeThreshold as boolean) ?? true,
        hasHECSDebt: (d.hasHECSDebt as boolean) ?? false,
        hasSFSSDebt: (d.hasSFSSDebt as boolean) ?? false,
        taxDeclarationDate: d.taxDeclarationAgreed ? new Date() : undefined,
        superFundName: (d.superFundName as string | undefined) || undefined,
        superFundAbn: (d.superFundAbn as string | undefined) || undefined,
        superFundUsi: (d.superFundUsi as string | undefined) || undefined,
        superMemberNumber: (d.superMemberNumber as string | undefined) || undefined,
        employmentType: ((d.employmentType as any) || 'FULL_TIME') as any,
        startDate: d.startDate ? new Date(d.startDate as string) : new Date(),
        awardCode: (d.awardCode as any) || undefined,
        depotId: (d.depotId as string | undefined) || undefined,
        payFrequency: 'WEEKLY' as const,
        isActive: true,
      },
    })

    // Initialise leave balances
    await tx.leaveBalance.createMany({
      data: ['ANNUAL', 'PERSONAL_CARERS', 'COMPASSIONATE', 'LONG_SERVICE'].map(lt => ({
        employeeId: employee.id,
        leaveType: lt as any,
        accrued: 0,
        used: 0,
        pending: 0,
        balance: 0,
      })),
      skipDuplicates: true,
    })

    // Add bank account if provided
    if (d.bankBsb && d.bankAccountNumber && d.bankAccountName) {
      await tx.bankAccount.create({
        data: {
          employeeId: employee.id,
          bsb: encrypt(d.bankBsb as string),
          accountNumber: encrypt(d.bankAccountNumber as string),
          accountName: d.bankAccountName as string,
          isPrimary: true,
        },
      })
    }

    // Add emergency contact if provided
    if (d.emergencyName && d.emergencyPhone) {
      await tx.emergencyContact.create({
        data: {
          employeeId: employee.id,
          name: d.emergencyName as string,
          relationship: (d.emergencyRelationship as string | undefined) || 'Other',
          phone: d.emergencyPhone as string,
          isPrimary: true,
        },
      })
    }

    // Create portal user account
    const bcrypt = await import('bcryptjs')
    const tempPassword = crypto.randomBytes(12).toString('base64url')
    const passwordHash = await bcrypt.default.hash(tempPassword, 12)

    const user = await tx.user.create({
      data: {
        organizationId: record.company.organizationId,
        email: record.inviteEmail.toLowerCase(),
        passwordHash,
        firstName: (d.firstName as string) ?? '',
        lastName: (d.lastName as string) ?? '',
        globalRole: 'ORG_USER',
        employeeId: employee.id,
        companyAccess: {
          create: { companyId, role: 'EMPLOYEE' },
        },
      },
    })

    // Mark onboarding as completed
    await tx.employeeOnboarding.update({
      where: { id: record.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        employeeId: employee.id,
      },
    })

    return { employee, user, tempPassword }
  })

  return {
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    email: user.email,
    message: 'Employee activated. A welcome email will be sent with login credentials.',
  }
}

export async function resendInvite(onboardingId: string, companyId: string) {
  const record = await prisma.employeeOnboarding.findFirst({
    where: { id: onboardingId, companyId },
    include: { company: { select: { name: true } } },
  })
  if (!record) throw new NotFoundError('Onboarding')
  if (record.status === 'COMPLETED') throw new AppError(400, 'Already completed')

  // Extend expiry
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS)

  await prisma.employeeOnboarding.update({
    where: { id: record.id },
    data: { expiresAt, status: record.status === 'EXPIRED' ? 'INVITED' : record.status },
  })

  const inviteUrl = `${config.FRONTEND_URL}/onboard/${record.token}`
  const email = onboardingInviteEmail({
    companyName: record.company.name,
    inviterName: 'Your employer',
    inviteUrl,
    expiresInDays: TOKEN_EXPIRY_DAYS,
  })
  email.to = record.inviteEmail
  await sendEmail(email)

  return { sent: true, inviteUrl }
}

export async function cancelInvite(onboardingId: string, companyId: string) {
  const record = await prisma.employeeOnboarding.findFirst({
    where: { id: onboardingId, companyId, status: { not: 'COMPLETED' } },
  })
  if (!record) throw new NotFoundError('Onboarding')

  await prisma.employeeOnboarding.update({
    where: { id: record.id },
    data: { status: 'EXPIRED' },
  })

  return { cancelled: true }
}
