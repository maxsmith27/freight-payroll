import { PrismaClient, GlobalRole, CompanyRole, EmploymentType, PayFrequency, PayType, AwardCode, AwardClassificationLevel, TaxResidencyStatus, LeaveType, LicenceClass } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database…')

  // --- Organisation ---
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-freight-group' },
    update: {},
    create: {
      id: 'seed-org-01',
      name: 'Demo Freight Group',
      slug: 'demo-freight-group',
    },
  })

  // --- Company ---
  const company = await prisma.company.upsert({
    where: { abn: '12345678901' },
    update: {},
    create: {
      id: 'seed-co-01',
      organizationId: org.id,
      name: 'Demo Freight Pty Ltd',
      abn: '12345678901',
      addressState: 'NSW',
      defaultPayFrequency: PayFrequency.WEEKLY,
    },
  })

  // --- Depot ---
  const depot = await prisma.depot.upsert({
    where: { companyId_code: { companyId: company.id, code: 'SYD' } },
    update: {},
    create: {
      id: 'seed-depot-01',
      companyId: company.id,
      name: 'Sydney Depot',
      code: 'SYD',
      addressState: 'NSW',
      addressStreet: '1 Logistics Way',
      addressSuburb: 'Wetherill Park',
      addressPostcode: '2164',
    },
  })

  // --- Admin user ---
  const adminHash = await bcrypt.hash('Password123!', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.freightpayroll.com.au' },
    update: {},
    create: {
      email: 'admin@demo.freightpayroll.com.au',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      globalRole: GlobalRole.SUPER_ADMIN,
      organizationId: org.id,
    },
  })

  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: {},
    create: { userId: admin.id, companyId: company.id, role: CompanyRole.COMPANY_ADMIN },
  })

  console.log('  Created admin: admin@demo.freightpayroll.com.au / Password123!')

  // --- Payroll manager ---
  const pmHash = await bcrypt.hash('Password123!', 10)
  const pm = await prisma.user.upsert({
    where: { email: 'payroll@demo.freightpayroll.com.au' },
    update: {},
    create: {
      email: 'payroll@demo.freightpayroll.com.au',
      passwordHash: pmHash,
      firstName: 'Sarah',
      lastName: 'Chen',
      globalRole: GlobalRole.USER,
      organizationId: org.id,
    },
  })

  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: pm.id, companyId: company.id } },
    update: {},
    create: { userId: pm.id, companyId: company.id, role: CompanyRole.PAYROLL_MANAGER },
  })

  // --- Employees ---
  const employees = [
    {
      id: 'seed-emp-01',
      employeeNumber: 'EMP001',
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james.wilson@demo.com.au',
      employmentType: EmploymentType.FULL_TIME,
      startDate: new Date('2022-03-01'),
      payFrequency: PayFrequency.WEEKLY,
      awardCode: AwardCode.MA000038,
      classificationLevel: AwardClassificationLevel.GRADE_3,
      payType: PayType.HOURLY,
      baseRate: 29.50,
      taxFileNumber: '123456789',
      taxResidencyStatus: TaxResidencyStatus.RESIDENT,
      claimsTaxFreeThreshold: true,
      hasHECSDebt: false,
      superFundName: 'AustralianSuper',
      superMemberNumber: 'AS123456',
      licenceClass: LicenceClass.HC,
    },
    {
      id: 'seed-emp-02',
      employeeNumber: 'EMP002',
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@demo.com.au',
      employmentType: EmploymentType.FULL_TIME,
      startDate: new Date('2021-07-15'),
      payFrequency: PayFrequency.WEEKLY,
      awardCode: AwardCode.MA000038,
      classificationLevel: AwardClassificationLevel.GRADE_4,
      payType: PayType.HOURLY,
      baseRate: 31.80,
      taxFileNumber: '987654321',
      taxResidencyStatus: TaxResidencyStatus.RESIDENT,
      claimsTaxFreeThreshold: true,
      hasHECSDebt: true,
      superFundName: 'Hostplus',
      superMemberNumber: 'HP789012',
      licenceClass: LicenceClass.MC,
    },
    {
      id: 'seed-emp-03',
      employeeNumber: 'EMP003',
      firstName: 'David',
      lastName: 'Nguyen',
      email: 'david.nguyen@demo.com.au',
      employmentType: EmploymentType.CASUAL,
      startDate: new Date('2023-01-10'),
      payFrequency: PayFrequency.WEEKLY,
      awardCode: AwardCode.MA000038,
      classificationLevel: AwardClassificationLevel.GRADE_2,
      payType: PayType.HOURLY,
      baseRate: 27.42,
      taxFileNumber: '456789123',
      taxResidencyStatus: TaxResidencyStatus.RESIDENT,
      claimsTaxFreeThreshold: false,
      hasHECSDebt: false,
      superFundName: 'Cbus',
      superMemberNumber: 'CB345678',
      licenceClass: LicenceClass.HR,
    },
  ]

  for (const empData of employees) {
    const { licenceClass, payType, baseRate, classificationLevel, taxFileNumber, hasHECSDebt, ...empFields } = empData

    const emp = await prisma.employee.upsert({
      where: { id: empData.id },
      update: {},
      create: {
        ...empFields,
        taxFileNumber,
        hasHECSDebt,
        companyId: company.id,
        depotId: depot.id,
        isActive: true,
      },
    })

    // Pay rate
    const existingRate = await prisma.employeePayRate.findFirst({
      where: { employeeId: emp.id, effectiveTo: null },
    })
    if (!existingRate) {
      await prisma.employeePayRate.create({
        data: {
          employeeId: emp.id,
          payType,
          hourlyRate: payType === PayType.HOURLY ? baseRate : null,
          annualSalary: payType === PayType.SALARY ? baseRate : null,
          ratePerKm: payType === PayType.KILOMETRE ? baseRate : null,
          ratePerLoad: payType === PayType.LOAD ? baseRate : null,
          effectiveFrom: empFields.startDate,
          createdBy: admin.id,
        },
      })
    }

    // Award classification
    const existingClass = await prisma.employeeAwardClassification.findFirst({
      where: { employeeId: emp.id, effectiveTo: null },
    })
    if (!existingClass && empFields.awardCode && classificationLevel) {
      await prisma.employeeAwardClassification.create({
        data: {
          employeeId: emp.id,
          awardCode: empFields.awardCode,
          classificationLevel,
          effectiveFrom: empFields.startDate,
          createdBy: admin.id,
        },
      })
    }

    // Leave balances
    const leaveTypes: LeaveType[] = ['ANNUAL', 'PERSONAL_CARERS', 'COMPASSIONATE', 'LONG_SERVICE']
    for (const leaveType of leaveTypes) {
      const initialBalance = leaveType === 'ANNUAL' ? 76 : leaveType === 'PERSONAL_CARERS' ? 38 : 0
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveType: { employeeId: emp.id, leaveType } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveType,
          accrued: initialBalance,
          balance: initialBalance,
        },
      })
    }

    // Driver licence
    const existingLicence = await prisma.driverLicence.findFirst({ where: { employeeId: emp.id } })
    if (!existingLicence) {
      await prisma.driverLicence.create({
        data: {
          employeeId: emp.id,
          licenceClasses: { set: [licenceClass] },
          licenceNumber: `NSW${empData.id.slice(-3).toUpperCase()}1234`,
          licenceState: 'NSW',
          issueDate: new Date('2020-01-01'),
          expiryDate: new Date('2026-12-31'),
          isActive: true,
        },
      })
    }

    console.log(`  Created employee: ${empData.firstName} ${empData.lastName} (${empData.employeeNumber})`)
  }

  // --- Public holidays (NSW 2025–2026) ---
  const publicHolidays = [
    { name: "New Year's Day",  date: new Date('2025-01-01'), state: 'NSW' },
    { name: 'Australia Day',   date: new Date('2025-01-27'), state: 'NSW' },
    { name: 'Good Friday',     date: new Date('2025-04-18'), state: 'NSW' },
    { name: 'Easter Saturday', date: new Date('2025-04-19'), state: 'NSW' },
    { name: 'Easter Sunday',   date: new Date('2025-04-20'), state: 'NSW' },
    { name: 'Easter Monday',   date: new Date('2025-04-21'), state: 'NSW' },
    { name: 'Anzac Day',       date: new Date('2025-04-25'), state: 'NSW' },
    { name: "King's Birthday", date: new Date('2025-06-09'), state: 'NSW' },
    { name: 'Bank Holiday',    date: new Date('2025-08-04'), state: 'NSW' },
    { name: 'Labour Day',      date: new Date('2025-10-06'), state: 'NSW' },
    { name: 'Christmas Day',   date: new Date('2025-12-25'), state: 'NSW' },
    { name: 'Boxing Day',      date: new Date('2025-12-26'), state: 'NSW' },
    { name: "New Year's Day",  date: new Date('2026-01-01'), state: 'NSW' },
    { name: 'Australia Day',   date: new Date('2026-01-26'), state: 'NSW' },
    { name: 'Good Friday',     date: new Date('2026-04-03'), state: 'NSW' },
    { name: 'Easter Saturday', date: new Date('2026-04-04'), state: 'NSW' },
    { name: 'Easter Sunday',   date: new Date('2026-04-05'), state: 'NSW' },
    { name: 'Easter Monday',   date: new Date('2026-04-06'), state: 'NSW' },
    { name: 'Anzac Day',       date: new Date('2026-04-25'), state: 'NSW' },
    { name: "King's Birthday", date: new Date('2026-06-08'), state: 'NSW' },
    { name: 'Christmas Day',   date: new Date('2026-12-25'), state: 'NSW' },
    { name: 'Boxing Day',      date: new Date('2026-12-28'), state: 'NSW' },
  ]

  for (const ph of publicHolidays) {
    await prisma.publicHoliday.upsert({
      where: { date_state: { date: ph.date, state: ph.state } },
      update: {},
      create: { name: ph.name, date: ph.date, state: ph.state, year: ph.date.getFullYear() },
    })
  }

  console.log(`  Seeded ${publicHolidays.length} public holidays`)
  console.log('\nSeed complete.')
  console.log('\nLogin credentials:')
  console.log('  Admin:   admin@demo.freightpayroll.com.au / Password123!')
  console.log('  Payroll: payroll@demo.freightpayroll.com.au / Password123!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
