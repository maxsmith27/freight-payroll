import { PrismaClient, GlobalRole, CompanyRole, EmploymentType, PayFrequency, PayType, AwardCode, AwardClassificationLevel, TaxResidencyStatus, LeaveType, LicenceClass, AllowanceRateType, PenaltyRateType } from '@prisma/client'
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

  // --- Depots ---
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

  const depot2 = await prisma.depot.upsert({
    where: { companyId_code: { companyId: company.id, code: 'MEL' } },
    update: {},
    create: {
      id: 'seed-depot-02',
      companyId: company.id,
      name: 'Melbourne Depot',
      code: 'MEL',
      addressState: 'VIC',
      addressStreet: '42 Transport Drive',
      addressSuburb: 'Laverton North',
      addressPostcode: '3026',
    },
  })

  const pw = 'Password123!'
  const hash = await bcrypt.hash(pw, 10)

  // --- Company Admin ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.freightpayroll.com.au' },
    update: {},
    create: {
      id: 'seed-user-admin',
      email: 'admin@demo.freightpayroll.com.au',
      passwordHash: hash,
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

  // --- Payroll Manager ---
  const pm = await prisma.user.upsert({
    where: { email: 'payroll@demo.freightpayroll.com.au' },
    update: {},
    create: {
      id: 'seed-user-pm',
      email: 'payroll@demo.freightpayroll.com.au',
      passwordHash: hash,
      firstName: 'Sarah',
      lastName: 'Chen',
      globalRole: GlobalRole.ORG_USER,
      organizationId: org.id,
    },
  })
  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: pm.id, companyId: company.id } },
    update: {},
    create: { userId: pm.id, companyId: company.id, role: CompanyRole.PAYROLL_MANAGER },
  })

  // --- Depot Manager (Sydney) ---
  const dm = await prisma.user.upsert({
    where: { email: 'depot.manager@demo.freightpayroll.com.au' },
    update: {},
    create: {
      id: 'seed-user-dm',
      email: 'depot.manager@demo.freightpayroll.com.au',
      passwordHash: hash,
      firstName: 'Tom',
      lastName: 'Richards',
      globalRole: GlobalRole.ORG_USER,
      organizationId: org.id,
    },
  })
  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: dm.id, companyId: company.id } },
    update: {},
    create: { userId: dm.id, companyId: company.id, role: CompanyRole.DEPOT_MANAGER, depotId: depot.id },
  })

  // --- Supervisor (Sydney — scoped to their team) ---
  const sup = await prisma.user.upsert({
    where: { email: 'supervisor@demo.freightpayroll.com.au' },
    update: {},
    create: {
      id: 'seed-user-sup',
      email: 'supervisor@demo.freightpayroll.com.au',
      passwordHash: hash,
      firstName: 'Lisa',
      lastName: 'Park',
      globalRole: GlobalRole.ORG_USER,
      organizationId: org.id,
    },
  })
  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: sup.id, companyId: company.id } },
    update: {},
    create: { userId: sup.id, companyId: company.id, role: CompanyRole.SUPERVISOR, depotId: depot.id },
  })

  // --- Employees ---
  // EMP001-003 are in Sydney depot (visible to supervisor + depot manager)
  // EMP004 is in Melbourne depot (NOT visible to Sydney-scoped users)
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
      depotId: depot.id,
      portalEmail: 'employee1@demo.freightpayroll.com.au',
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
      depotId: depot.id,
      portalEmail: null,
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
      depotId: depot.id,
      portalEmail: null,
    },
    {
      id: 'seed-emp-04',
      employeeNumber: 'EMP004',
      firstName: 'Rachel',
      lastName: 'Thompson',
      email: 'rachel.thompson@demo.com.au',
      employmentType: EmploymentType.FULL_TIME,
      startDate: new Date('2023-06-01'),
      payFrequency: PayFrequency.WEEKLY,
      awardCode: AwardCode.MA000038,
      classificationLevel: AwardClassificationLevel.GRADE_3,
      payType: PayType.HOURLY,
      baseRate: 29.50,
      taxFileNumber: '321654987',
      taxResidencyStatus: TaxResidencyStatus.RESIDENT,
      claimsTaxFreeThreshold: true,
      hasHECSDebt: false,
      superFundName: 'REST',
      superMemberNumber: 'RE111222',
      licenceClass: LicenceClass.HC,
      depotId: depot2.id,
      portalEmail: null,
    },
  ]

  for (const empData of employees) {
    const { licenceClass, payType, baseRate, classificationLevel, taxFileNumber, hasHECSDebt, depotId: empDepotId, portalEmail, ...empFields } = empData

    const emp = await prisma.employee.upsert({
      where: { id: empData.id },
      update: {},
      create: {
        ...empFields,
        taxFileNumber,
        hasHECSDebt,
        companyId: company.id,
        depotId: empDepotId,
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

    // Portal login (EMPLOYEE role) for employees that have one
    if (portalEmail) {
      const existing = await prisma.user.findUnique({ where: { email: portalEmail } })
      if (!existing) {
        await prisma.user.create({
          data: {
            email: portalEmail,
            passwordHash: hash,
            firstName: emp.firstName,
            lastName: emp.lastName,
            globalRole: GlobalRole.ORG_USER,
            organizationId: org.id,
            employeeId: emp.id,
            companyAccess: {
              create: { companyId: company.id, role: CompanyRole.EMPLOYEE },
            },
          },
        })
      }
    }

    console.log(`  Created employee: ${empData.firstName} ${empData.lastName} (${empData.employeeNumber})`)
  }

  await seedPublicHolidays()

  await seedRates()

  console.log('\nSeed complete.')
  console.log('\n─── Test login credentials (all use Password123!) ───────────────────')
  console.log('  COMPANY_ADMIN    admin@demo.freightpayroll.com.au     → full access, all depots')
  console.log('  PAYROLL_MANAGER  payroll@demo.freightpayroll.com.au   → payroll + reports, all depots')
  console.log('  DEPOT_MANAGER    depot.manager@demo.freightpayroll.com.au → Sydney depot only, no payroll')
  console.log('  SUPERVISOR       supervisor@demo.freightpayroll.com.au   → Sydney depot only, approve/reject only')
  console.log('  EMPLOYEE (ESS)   employee1@demo.freightpayroll.com.au    → employee portal only (James Wilson)')
  console.log('─────────────────────────────────────────────────────────────────────')
}

// ─────────────────────────────────────────────────────────────────────────────
// Public holidays — all 8 Australian states/territories, 2025–2027
//
// Sources (all accessed May 2026):
//   NSW: https://www.industrialrelations.nsw.gov.au/public-holidays/
//   VIC: https://www.vic.gov.au/victorian-public-holidays
//   QLD: https://www.qld.gov.au/recreation/travel/holidays/public
//   SA:  https://www.safework.sa.gov.au/resources/public-holidays
//   WA:  https://www.commerce.wa.gov.au/labour-relations/public-holidays-western-australia
//   TAS: https://worksafe.tas.gov.au/topics/laws-and-compliance/public-holidays
//   NT:  https://nt.gov.au/employ/employee-rights-and-conditions/leave-and-holidays/public-holidays
//   ACT: https://www.act.gov.au/public-holidays
//
// Floating holiday rules applied:
//   - Australia Day: observed Mon if 26 Jan falls on Sun (or Sat in some states)
//   - Anzac Day: additional Mon public holiday when 25 Apr falls on Sun
//   - Christmas: observed Mon 27 Dec when 25 Dec is Sat; Tue 28 Dec when 25 Dec is Sun
//   - Boxing Day: observed Mon 28 Dec when 26 Dec is Sat; Tue 28 Dec when 25 Dec is Sat
//
// ⚠ Verify against official state gazettes before using in production payroll.
// ─────────────────────────────────────────────────────────────────────────────

async function seedPublicHolidays() {
  type PH = { name: string; date: string; state: string }

  const holidays: PH[] = [
    // ── NSW ────────────────────────────────────────────────────────────────────
    // 2025
    { state: 'NSW', date: '2025-01-01', name: "New Year's Day" },
    { state: 'NSW', date: '2025-01-27', name: 'Australia Day' },           // 26 Jan is Sun → observed Mon
    { state: 'NSW', date: '2025-04-18', name: 'Good Friday' },
    { state: 'NSW', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'NSW', date: '2025-04-20', name: 'Easter Sunday' },
    { state: 'NSW', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'NSW', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'NSW', date: '2025-06-09', name: "King's Birthday" },         // 2nd Mon Jun
    { state: 'NSW', date: '2025-08-04', name: 'Bank Holiday' },            // 1st Mon Aug
    { state: 'NSW', date: '2025-10-06', name: 'Labour Day' },              // 1st Mon Oct
    { state: 'NSW', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'NSW', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'NSW', date: '2026-01-01', name: "New Year's Day" },
    { state: 'NSW', date: '2026-01-26', name: 'Australia Day' },
    { state: 'NSW', date: '2026-04-03', name: 'Good Friday' },
    { state: 'NSW', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'NSW', date: '2026-04-05', name: 'Easter Sunday' },
    { state: 'NSW', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'NSW', date: '2026-04-25', name: 'Anzac Day' },               // Sat — no sub in NSW
    { state: 'NSW', date: '2026-06-08', name: "King's Birthday" },         // 2nd Mon Jun
    { state: 'NSW', date: '2026-08-03', name: 'Bank Holiday' },            // 1st Mon Aug
    { state: 'NSW', date: '2026-10-05', name: 'Labour Day' },              // 1st Mon Oct
    { state: 'NSW', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'NSW', date: '2026-12-28', name: 'Boxing Day' },              // 26 Dec Sat → observed Mon
    // 2027
    { state: 'NSW', date: '2027-01-01', name: "New Year's Day" },
    { state: 'NSW', date: '2027-01-26', name: 'Australia Day' },
    { state: 'NSW', date: '2027-03-26', name: 'Good Friday' },
    { state: 'NSW', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'NSW', date: '2027-03-28', name: 'Easter Sunday' },
    { state: 'NSW', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'NSW', date: '2027-04-25', name: 'Anzac Day' },               // Sun
    { state: 'NSW', date: '2027-04-26', name: 'Anzac Day (additional)' },  // Mon sub when 25 Apr is Sun
    { state: 'NSW', date: '2027-06-14', name: "King's Birthday" },         // 2nd Mon Jun
    { state: 'NSW', date: '2027-08-02', name: 'Bank Holiday' },            // 1st Mon Aug
    { state: 'NSW', date: '2027-10-04', name: 'Labour Day' },              // 1st Mon Oct
    { state: 'NSW', date: '2027-12-27', name: 'Christmas Day' },           // 25 Dec Sat → observed Mon
    { state: 'NSW', date: '2027-12-28', name: 'Boxing Day' },              // 26 Dec Sun → observed Tue

    // ── VIC ────────────────────────────────────────────────────────────────────
    // 2025
    { state: 'VIC', date: '2025-01-01', name: "New Year's Day" },
    { state: 'VIC', date: '2025-01-27', name: 'Australia Day' },
    { state: 'VIC', date: '2025-03-10', name: 'Labour Day' },              // 2nd Mon Mar
    { state: 'VIC', date: '2025-04-18', name: 'Good Friday' },
    { state: 'VIC', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'VIC', date: '2025-04-20', name: 'Easter Sunday' },
    { state: 'VIC', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'VIC', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'VIC', date: '2025-06-09', name: "King's Birthday" },         // 2nd Mon Jun
    { state: 'VIC', date: '2025-11-04', name: 'Melbourne Cup Day' },       // 1st Tue Nov
    { state: 'VIC', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'VIC', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'VIC', date: '2026-01-01', name: "New Year's Day" },
    { state: 'VIC', date: '2026-01-26', name: 'Australia Day' },
    { state: 'VIC', date: '2026-03-09', name: 'Labour Day' },              // 2nd Mon Mar
    { state: 'VIC', date: '2026-04-03', name: 'Good Friday' },
    { state: 'VIC', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'VIC', date: '2026-04-05', name: 'Easter Sunday' },
    { state: 'VIC', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'VIC', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'VIC', date: '2026-06-08', name: "King's Birthday" },
    { state: 'VIC', date: '2026-11-03', name: 'Melbourne Cup Day' },       // 1st Tue Nov
    { state: 'VIC', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'VIC', date: '2026-12-28', name: 'Boxing Day' },
    // 2027
    { state: 'VIC', date: '2027-01-01', name: "New Year's Day" },
    { state: 'VIC', date: '2027-01-26', name: 'Australia Day' },
    { state: 'VIC', date: '2027-03-08', name: 'Labour Day' },              // 2nd Mon Mar
    { state: 'VIC', date: '2027-03-26', name: 'Good Friday' },
    { state: 'VIC', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'VIC', date: '2027-03-28', name: 'Easter Sunday' },
    { state: 'VIC', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'VIC', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'VIC', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'VIC', date: '2027-06-14', name: "King's Birthday" },
    { state: 'VIC', date: '2027-11-02', name: 'Melbourne Cup Day' },       // 1st Tue Nov
    { state: 'VIC', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'VIC', date: '2027-12-28', name: 'Boxing Day' },

    // ── QLD ────────────────────────────────────────────────────────────────────
    // Easter Sunday is NOT a public holiday in QLD.
    // King's Birthday: 2nd Mon October (moved from June in 2016)
    // 2025
    { state: 'QLD', date: '2025-01-01', name: "New Year's Day" },
    { state: 'QLD', date: '2025-01-27', name: 'Australia Day' },
    { state: 'QLD', date: '2025-04-18', name: 'Good Friday' },
    { state: 'QLD', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'QLD', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'QLD', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'QLD', date: '2025-05-05', name: 'Labour Day' },              // 1st Mon May
    { state: 'QLD', date: '2025-10-13', name: "King's Birthday" },         // 2nd Mon Oct
    { state: 'QLD', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'QLD', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'QLD', date: '2026-01-01', name: "New Year's Day" },
    { state: 'QLD', date: '2026-01-26', name: 'Australia Day' },
    { state: 'QLD', date: '2026-04-03', name: 'Good Friday' },
    { state: 'QLD', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'QLD', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'QLD', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'QLD', date: '2026-05-04', name: 'Labour Day' },              // 1st Mon May
    { state: 'QLD', date: '2026-10-12', name: "King's Birthday" },         // 2nd Mon Oct
    { state: 'QLD', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'QLD', date: '2026-12-28', name: 'Boxing Day' },
    // 2027
    { state: 'QLD', date: '2027-01-01', name: "New Year's Day" },
    { state: 'QLD', date: '2027-01-26', name: 'Australia Day' },
    { state: 'QLD', date: '2027-03-26', name: 'Good Friday' },
    { state: 'QLD', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'QLD', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'QLD', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'QLD', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'QLD', date: '2027-05-03', name: 'Labour Day' },              // 1st Mon May
    { state: 'QLD', date: '2027-10-11', name: "King's Birthday" },         // 2nd Mon Oct
    { state: 'QLD', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'QLD', date: '2027-12-28', name: 'Boxing Day' },

    // ── SA ─────────────────────────────────────────────────────────────────────
    // SA does not observe Easter Sunday as a PH.
    // SA calls Boxing Day "Proclamation Day".
    // Adelaide Cup: 2nd Mon May
    // 2025
    { state: 'SA', date: '2025-01-01', name: "New Year's Day" },
    { state: 'SA', date: '2025-01-27', name: 'Australia Day' },
    { state: 'SA', date: '2025-04-18', name: 'Good Friday' },
    { state: 'SA', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'SA', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'SA', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'SA', date: '2025-05-12', name: 'Adelaide Cup' },             // 2nd Mon May
    { state: 'SA', date: '2025-06-09', name: "King's Birthday" },          // 2nd Mon Jun
    { state: 'SA', date: '2025-10-06', name: 'Labour Day' },               // 1st Mon Oct
    { state: 'SA', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'SA', date: '2025-12-26', name: 'Proclamation Day' },
    // 2026
    { state: 'SA', date: '2026-01-01', name: "New Year's Day" },
    { state: 'SA', date: '2026-01-26', name: 'Australia Day' },
    { state: 'SA', date: '2026-04-03', name: 'Good Friday' },
    { state: 'SA', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'SA', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'SA', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'SA', date: '2026-05-11', name: 'Adelaide Cup' },             // 2nd Mon May
    { state: 'SA', date: '2026-06-08', name: "King's Birthday" },
    { state: 'SA', date: '2026-10-05', name: 'Labour Day' },
    { state: 'SA', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'SA', date: '2026-12-28', name: 'Proclamation Day' },
    // 2027
    { state: 'SA', date: '2027-01-01', name: "New Year's Day" },
    { state: 'SA', date: '2027-01-26', name: 'Australia Day' },
    { state: 'SA', date: '2027-03-26', name: 'Good Friday' },
    { state: 'SA', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'SA', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'SA', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'SA', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'SA', date: '2027-05-10', name: 'Adelaide Cup' },             // 2nd Mon May
    { state: 'SA', date: '2027-06-14', name: "King's Birthday" },
    { state: 'SA', date: '2027-10-04', name: 'Labour Day' },
    { state: 'SA', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'SA', date: '2027-12-28', name: 'Proclamation Day' },

    // ── WA ─────────────────────────────────────────────────────────────────────
    // WA does not observe Easter Sunday as a PH.
    // Foundation Day (Western Australia Day): 1st Mon Jun
    // King's Birthday: 4th Mon Sep
    // Labour Day: 1st Mon Mar
    // 2025
    { state: 'WA', date: '2025-01-01', name: "New Year's Day" },
    { state: 'WA', date: '2025-01-27', name: 'Australia Day' },
    { state: 'WA', date: '2025-03-03', name: 'Labour Day' },               // 1st Mon Mar
    { state: 'WA', date: '2025-04-18', name: 'Good Friday' },
    { state: 'WA', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'WA', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'WA', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'WA', date: '2025-06-02', name: 'Western Australia Day' },    // 1st Mon Jun
    { state: 'WA', date: '2025-09-22', name: "King's Birthday" },          // 4th Mon Sep
    { state: 'WA', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'WA', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'WA', date: '2026-01-01', name: "New Year's Day" },
    { state: 'WA', date: '2026-01-26', name: 'Australia Day' },
    { state: 'WA', date: '2026-03-02', name: 'Labour Day' },               // 1st Mon Mar
    { state: 'WA', date: '2026-04-03', name: 'Good Friday' },
    { state: 'WA', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'WA', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'WA', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'WA', date: '2026-06-01', name: 'Western Australia Day' },    // 1st Mon Jun
    { state: 'WA', date: '2026-09-28', name: "King's Birthday" },          // 4th Mon Sep
    { state: 'WA', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'WA', date: '2026-12-28', name: 'Boxing Day' },
    // 2027
    { state: 'WA', date: '2027-01-01', name: "New Year's Day" },
    { state: 'WA', date: '2027-01-26', name: 'Australia Day' },
    { state: 'WA', date: '2027-03-01', name: 'Labour Day' },               // 1st Mon Mar
    { state: 'WA', date: '2027-03-26', name: 'Good Friday' },
    { state: 'WA', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'WA', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'WA', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'WA', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'WA', date: '2027-06-07', name: 'Western Australia Day' },    // 1st Mon Jun
    { state: 'WA', date: '2027-09-27', name: "King's Birthday" },          // 4th Mon Sep
    { state: 'WA', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'WA', date: '2027-12-28', name: 'Boxing Day' },

    // ── TAS ────────────────────────────────────────────────────────────────────
    // TAS does not observe Easter Sunday as a PH.
    // Eight Hours Day (Labour Day): 2nd Mon Mar
    // 2025
    { state: 'TAS', date: '2025-01-01', name: "New Year's Day" },
    { state: 'TAS', date: '2025-01-27', name: 'Australia Day' },
    { state: 'TAS', date: '2025-03-10', name: 'Eight Hours Day' },         // 2nd Mon Mar
    { state: 'TAS', date: '2025-04-18', name: 'Good Friday' },
    { state: 'TAS', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'TAS', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'TAS', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'TAS', date: '2025-06-09', name: "King's Birthday" },         // 2nd Mon Jun
    { state: 'TAS', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'TAS', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'TAS', date: '2026-01-01', name: "New Year's Day" },
    { state: 'TAS', date: '2026-01-26', name: 'Australia Day' },
    { state: 'TAS', date: '2026-03-09', name: 'Eight Hours Day' },         // 2nd Mon Mar
    { state: 'TAS', date: '2026-04-03', name: 'Good Friday' },
    { state: 'TAS', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'TAS', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'TAS', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'TAS', date: '2026-06-08', name: "King's Birthday" },
    { state: 'TAS', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'TAS', date: '2026-12-28', name: 'Boxing Day' },
    // 2027
    { state: 'TAS', date: '2027-01-01', name: "New Year's Day" },
    { state: 'TAS', date: '2027-01-26', name: 'Australia Day' },
    { state: 'TAS', date: '2027-03-08', name: 'Eight Hours Day' },         // 2nd Mon Mar
    { state: 'TAS', date: '2027-03-26', name: 'Good Friday' },
    { state: 'TAS', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'TAS', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'TAS', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'TAS', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'TAS', date: '2027-06-14', name: "King's Birthday" },
    { state: 'TAS', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'TAS', date: '2027-12-28', name: 'Boxing Day' },

    // ── NT ─────────────────────────────────────────────────────────────────────
    // NT does not observe Easter Sunday as a PH.
    // May Day: 1st Mon May
    // Picnic Day: 1st Mon Aug
    // 2025
    { state: 'NT', date: '2025-01-01', name: "New Year's Day" },
    { state: 'NT', date: '2025-01-27', name: 'Australia Day' },
    { state: 'NT', date: '2025-04-18', name: 'Good Friday' },
    { state: 'NT', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'NT', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'NT', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'NT', date: '2025-05-05', name: 'May Day' },                  // 1st Mon May
    { state: 'NT', date: '2025-06-09', name: "King's Birthday" },          // 2nd Mon Jun
    { state: 'NT', date: '2025-08-04', name: 'Picnic Day' },               // 1st Mon Aug
    { state: 'NT', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'NT', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'NT', date: '2026-01-01', name: "New Year's Day" },
    { state: 'NT', date: '2026-01-26', name: 'Australia Day' },
    { state: 'NT', date: '2026-04-03', name: 'Good Friday' },
    { state: 'NT', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'NT', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'NT', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'NT', date: '2026-05-04', name: 'May Day' },                  // 1st Mon May
    { state: 'NT', date: '2026-06-08', name: "King's Birthday" },
    { state: 'NT', date: '2026-08-03', name: 'Picnic Day' },               // 1st Mon Aug
    { state: 'NT', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'NT', date: '2026-12-28', name: 'Boxing Day' },
    // 2027
    { state: 'NT', date: '2027-01-01', name: "New Year's Day" },
    { state: 'NT', date: '2027-01-26', name: 'Australia Day' },
    { state: 'NT', date: '2027-03-26', name: 'Good Friday' },
    { state: 'NT', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'NT', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'NT', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'NT', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'NT', date: '2027-05-03', name: 'May Day' },                  // 1st Mon May
    { state: 'NT', date: '2027-06-14', name: "King's Birthday" },
    { state: 'NT', date: '2027-08-02', name: 'Picnic Day' },               // 1st Mon Aug
    { state: 'NT', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'NT', date: '2027-12-28', name: 'Boxing Day' },

    // ── ACT ────────────────────────────────────────────────────────────────────
    // ACT does not observe Easter Sunday as a PH.
    // Canberra Day: 2nd Mon Mar
    // Reconciliation Day: Mon on or before 27 May
    // Labour Day: 1st Mon Oct
    // 2025
    { state: 'ACT', date: '2025-01-01', name: "New Year's Day" },
    { state: 'ACT', date: '2025-01-27', name: 'Australia Day' },
    { state: 'ACT', date: '2025-03-10', name: 'Canberra Day' },            // 2nd Mon Mar
    { state: 'ACT', date: '2025-04-18', name: 'Good Friday' },
    { state: 'ACT', date: '2025-04-19', name: 'Easter Saturday' },
    { state: 'ACT', date: '2025-04-21', name: 'Easter Monday' },
    { state: 'ACT', date: '2025-04-25', name: 'Anzac Day' },
    { state: 'ACT', date: '2025-05-26', name: 'Reconciliation Day' },      // Mon on or before 27 May (27=Tue)
    { state: 'ACT', date: '2025-06-09', name: "King's Birthday" },         // 2nd Mon Jun
    { state: 'ACT', date: '2025-10-06', name: 'Labour Day' },              // 1st Mon Oct
    { state: 'ACT', date: '2025-12-25', name: 'Christmas Day' },
    { state: 'ACT', date: '2025-12-26', name: 'Boxing Day' },
    // 2026
    { state: 'ACT', date: '2026-01-01', name: "New Year's Day" },
    { state: 'ACT', date: '2026-01-26', name: 'Australia Day' },
    { state: 'ACT', date: '2026-03-09', name: 'Canberra Day' },            // 2nd Mon Mar
    { state: 'ACT', date: '2026-04-03', name: 'Good Friday' },
    { state: 'ACT', date: '2026-04-04', name: 'Easter Saturday' },
    { state: 'ACT', date: '2026-04-06', name: 'Easter Monday' },
    { state: 'ACT', date: '2026-04-25', name: 'Anzac Day' },
    { state: 'ACT', date: '2026-05-25', name: 'Reconciliation Day' },      // Mon on or before 27 May (27=Wed)
    { state: 'ACT', date: '2026-06-08', name: "King's Birthday" },
    { state: 'ACT', date: '2026-10-05', name: 'Labour Day' },
    { state: 'ACT', date: '2026-12-25', name: 'Christmas Day' },
    { state: 'ACT', date: '2026-12-28', name: 'Boxing Day' },
    // 2027
    { state: 'ACT', date: '2027-01-01', name: "New Year's Day" },
    { state: 'ACT', date: '2027-01-26', name: 'Australia Day' },
    { state: 'ACT', date: '2027-03-08', name: 'Canberra Day' },            // 2nd Mon Mar
    { state: 'ACT', date: '2027-03-26', name: 'Good Friday' },
    { state: 'ACT', date: '2027-03-27', name: 'Easter Saturday' },
    { state: 'ACT', date: '2027-03-29', name: 'Easter Monday' },
    { state: 'ACT', date: '2027-04-25', name: 'Anzac Day' },
    { state: 'ACT', date: '2027-04-26', name: 'Anzac Day (additional)' },
    { state: 'ACT', date: '2027-05-24', name: 'Reconciliation Day' },      // Mon on or before 27 May (27=Thu)
    { state: 'ACT', date: '2027-06-14', name: "King's Birthday" },
    { state: 'ACT', date: '2027-10-04', name: 'Labour Day' },
    { state: 'ACT', date: '2027-12-27', name: 'Christmas Day' },
    { state: 'ACT', date: '2027-12-28', name: 'Boxing Day' },
  ]

  await prisma.publicHoliday.deleteMany({ where: { year: { in: [2025, 2026, 2027] } } })
  await prisma.publicHoliday.createMany({
    data: holidays.map(h => {
      const date = new Date(h.date)
      return { name: h.name, date, state: h.state, year: date.getFullYear() }
    }),
  })
  console.log(`  Seeded ${holidays.length} public holidays (all states/territories, 2025–2027)`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Award rates, allowances, penalty rates, super rates, PAYG brackets
//
// MA000038 rates: verified against FWO pay guide published 18 Feb 2026
//   Source: https://calculate.fairwork.gov.au/Download/AwardSummary?awardCode=ma000038&fileType=pdf
//   Effective from: first full pay period on or after 1 July 2025
//
// MA000039 rates: verified against FWO pay guide published 10 Oct 2025
//   Source: https://calculate.fairwork.gov.au/Download/AwardSummary?awardCode=ma000039&fileType=pdf
//   Effective from: first full pay period on or after 10 October 2025
//   Note: grade numbers changed in Oct 2025 restructure (old Grade 1 = new Grade 3, etc.)
//
// Super rate: 12.0% effective 1 July 2025 — ATO final scheduled increase
//   Source: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
//
// PAYG brackets: FY2025-26 (Stage 3 cuts, unchanged from 2024-25)
//   Sources:
//     Residents:   https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
//     Foreign:     https://www.ato.gov.au/tax-rates-and-codes/tax-rates-foreign-residents
//     WHM:         https://www.ato.gov.au/individuals-and-families/coming-to-australia/working-holiday-makers
//   Scales seeded: Scale 1 (resident, no threshold), Scale 2 (resident, claims threshold),
//                  Scale 3 (foreign resident), Scale 6 (working holiday maker)
//   Coefficients a and b satisfy: weekly_tax = a × weekly_income − b
//   LITO and Medicare Levy are applied separately in the withholding engine.
//   ⚠ Verify NAT 3539 coefficients at ato.gov.au before using in production withholding.
// ─────────────────────────────────────────────────────────────────────────────

async function seedRates() {
  console.log('\nSeeding award rates, super, and PAYG brackets…')

  const SOURCE_38 = 'FWO MA000038 pay guide, published 18 Feb 2026, effective 1 Jul 2025'
  const SOURCE_39 = 'FWO MA000039 pay guide, published 10 Oct 2025, effective 10 Oct 2025'
  const SOURCE_SUPER = 'ATO super guarantee rates, key rates and thresholds'
  const SOURCE_PAYG = 'ATO tax rates for Australian residents, FY2025-26 (Stage 3)'

  // ── MA000038 base rates ─────────────────────────────────────────────────────
  // Weekly / hourly rates for Transport Workers (non-oil distribution), full-time/part-time.
  // Oil-distribution workers have the same weekly rate but different hourly rate (different
  // hours divisor) — we store the standard non-oil hourly rate here.
  const EFFECTIVE_38 = new Date('2025-07-01')

  const ma38Grades: { level: AwardClassificationLevel; weekly: string; hourly: string }[] = [
    { level: AwardClassificationLevel.GRADE_1,  weekly: '974.70',  hourly: '25.65' },
    { level: AwardClassificationLevel.GRADE_2,  weekly: '998.10',  hourly: '26.27' },
    { level: AwardClassificationLevel.GRADE_3,  weekly: '1009.60', hourly: '26.57' },
    { level: AwardClassificationLevel.GRADE_4,  weekly: '1027.40', hourly: '27.04' },
    { level: AwardClassificationLevel.GRADE_5,  weekly: '1040.20', hourly: '27.37' },
    { level: AwardClassificationLevel.GRADE_6,  weekly: '1052.00', hourly: '27.68' },
    { level: AwardClassificationLevel.GRADE_7,  weekly: '1067.30', hourly: '28.09' },
    { level: AwardClassificationLevel.GRADE_8,  weekly: '1098.30', hourly: '28.90' },
    { level: AwardClassificationLevel.GRADE_9,  weekly: '1116.70', hourly: '29.39' },
    { level: AwardClassificationLevel.GRADE_10, weekly: '1144.40', hourly: '30.12' },
  ]

  for (const g of ma38Grades) {
    const existing = await prisma.awardBaseRate.findFirst({ where: { award: AwardCode.MA000038, classificationLevel: g.level, vehicleGrade: null, effectiveFrom: EFFECTIVE_38 } })
    if (existing) {
      await prisma.awardBaseRate.update({ where: { id: existing.id }, data: { weeklyRate: g.weekly, hourlyRate: g.hourly } })
    } else {
      await prisma.awardBaseRate.create({ data: { award: AwardCode.MA000038, classificationLevel: g.level, weeklyRate: g.weekly, hourlyRate: g.hourly, effectiveFrom: EFFECTIVE_38, source: SOURCE_38 } })
    }
  }
  console.log(`  Seeded ${ma38Grades.length} MA000038 base rates`)

  // ── MA000039 base rates ─────────────────────────────────────────────────────
  // Grades 3–10 only (Grades 1 and 2 were removed in the Oct 2025 restructure).
  // Weekly rate is the ordinary-time weekly minimum.
  // Hourly rate shown is the "ordinary time hourly rate" for the hourly driving method
  // (higher than MA000038 because long-distance hours are counted differently).
  const EFFECTIVE_39 = new Date('2025-10-10')

  const ma39Grades: { level: AwardClassificationLevel; weekly: string; hourly: string }[] = [
    { level: AwardClassificationLevel.GRADE_3,  weekly: '1009.60', hourly: '39.37' },
    { level: AwardClassificationLevel.GRADE_4,  weekly: '1027.40', hourly: '40.07' },
    { level: AwardClassificationLevel.GRADE_5,  weekly: '1040.20', hourly: '40.57' },
    { level: AwardClassificationLevel.GRADE_6,  weekly: '1052.00', hourly: '41.03' },
    { level: AwardClassificationLevel.GRADE_7,  weekly: '1067.30', hourly: '41.62' },
    { level: AwardClassificationLevel.GRADE_8,  weekly: '1098.30', hourly: '42.83' },
    { level: AwardClassificationLevel.GRADE_9,  weekly: '1116.70', hourly: '43.55' },
    { level: AwardClassificationLevel.GRADE_10, weekly: '1144.40', hourly: '44.63' },
  ]

  for (const g of ma39Grades) {
    const existing = await prisma.awardBaseRate.findFirst({ where: { award: AwardCode.MA000039, classificationLevel: g.level, vehicleGrade: null, effectiveFrom: EFFECTIVE_39 } })
    if (existing) {
      await prisma.awardBaseRate.update({ where: { id: existing.id }, data: { weeklyRate: g.weekly, hourlyRate: g.hourly } })
    } else {
      await prisma.awardBaseRate.create({ data: { award: AwardCode.MA000039, classificationLevel: g.level, weeklyRate: g.weekly, hourlyRate: g.hourly, effectiveFrom: EFFECTIVE_39, source: SOURCE_39 } })
    }
  }
  console.log(`  Seeded ${ma39Grades.length} MA000039 base rates`)

  // ── MA000038 penalty rates ──────────────────────────────────────────────────
  // Multipliers apply to the employee's ordinary hourly rate.
  // Source: FWO MA000038 pay guide — penalty rates section.
  const penalties38: { type: PenaltyRateType; multiplier: string }[] = [
    { type: PenaltyRateType.SATURDAY,       multiplier: '1.5000' }, // time-and-a-half
    { type: PenaltyRateType.SUNDAY,         multiplier: '2.0000' }, // double time
    { type: PenaltyRateType.PUBLIC_HOLIDAY, multiplier: '2.5000' }, // double time and a half
    { type: PenaltyRateType.OVERTIME_1_5X,  multiplier: '1.5000' }, // first 2 hrs overtime
    { type: PenaltyRateType.OVERTIME_2X,    multiplier: '2.0000' }, // subsequent overtime
  ]

  for (const p of penalties38) {
    const existing = await prisma.awardPenaltyRate.findFirst({ where: { award: AwardCode.MA000038, penaltyType: p.type, classificationLevel: null, effectiveFrom: EFFECTIVE_38 } })
    if (existing) {
      await prisma.awardPenaltyRate.update({ where: { id: existing.id }, data: { multiplier: p.multiplier } })
    } else {
      await prisma.awardPenaltyRate.create({ data: { award: AwardCode.MA000038, penaltyType: p.type, multiplier: p.multiplier, effectiveFrom: EFFECTIVE_38, source: SOURCE_38 } })
    }
  }
  console.log(`  Seeded ${penalties38.length} MA000038 penalty rates`)

  // ── MA000038 allowances ─────────────────────────────────────────────────────
  const allowances38 = [
    { code: 'MA38_FIRST_AID',           name: 'First Aid Allowance',                 amount: '16.15',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'Employees holding a first aid qualification and required to apply it' },
    { code: 'MA38_LEADING_3_10',        name: 'Leading Hand (3–10 employees)',       amount: '47.65',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'In charge of 3 to 10 employees' },
    { code: 'MA38_LEADING_11_20',       name: 'Leading Hand (11–20 employees)',      amount: '70.97',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'In charge of 11 to 20 employees' },
    { code: 'MA38_LEADING_21_PLUS',     name: 'Leading Hand (21+ employees)',        amount: '90.16',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'In charge of more than 20 employees' },
    { code: 'MA38_MEAL_OVERTIME',       name: 'Meal Allowance (Overtime)',           amount: '20.32',  rateType: AllowanceRateType.FIXED,       isTaxable: false, stpCategory: 'AD', description: 'Meal allowance when required to work overtime' },
    { code: 'MA38_TRAVELLING',          name: 'Travelling Allowance',                amount: '40.08',  rateType: AllowanceRateType.PER_DAY,     isTaxable: false, stpCategory: 'AD', description: 'Minimum travelling allowance per day away from home base' },
    { code: 'MA38_DANGEROUS_BULK',      name: 'Dangerous Goods — Bulk',              amount: '23.93',  rateType: AllowanceRateType.PER_DAY,     isTaxable: true,  stpCategory: 'AD', description: 'Carrying dangerous goods in bulk (not packaged)' },
    { code: 'MA38_DANGEROUS_PACKAGED',  name: 'Dangerous Goods — Packaged',          amount: '10.00',  rateType: AllowanceRateType.PER_DAY,     isTaxable: true,  stpCategory: 'AD', description: 'Carrying packaged dangerous goods' },
    { code: 'MA38_DIRTY_MATERIAL',      name: 'Dirty Material Allowance',            amount: '0.61',   rateType: AllowanceRateType.PER_HOUR,    isTaxable: true,  stpCategory: 'AD', description: 'When working with dirty or offensive material' },
    { code: 'MA38_DRIVER_SALESPERSON',  name: 'Driver-Salesperson Allowance',        amount: '22.11',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'Employee acting as driver and salesperson' },
    { code: 'MA38_FURNITURE_CARTER',    name: 'Furniture Carter Allowance',          amount: '26.15',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'Furniture carter employees' },
    { code: 'MA38_GARBAGE',             name: 'Garbage Collecting Vehicle',          amount: '24.13',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'Operating garbage collecting vehicles' },
    { code: 'MA38_LIVESTOCK',           name: 'Livestock Carter Allowance',          amount: '26.15',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'Livestock carter employees' },
    { code: 'MA38_VEHICLE_OVERSIZE',    name: 'Vehicle Allowance — Oversize/Crane',  amount: '4.64',   rateType: AllowanceRateType.PER_DAY,     isTaxable: true,  stpCategory: 'AD', description: 'Low loader, oversize, crane, or side lifter vehicles' },
    { code: 'MA38_CARBON_BLACK',        name: 'Carbon Black Allowance',              amount: '2.83',   rateType: AllowanceRateType.PER_DAY,     isTaxable: true,  stpCategory: 'AD', description: 'Work involving carbon black' },
    { code: 'MA38_COFFIN_HANDLING',     name: 'Coffin Handling Allowance',           amount: '3.84',   rateType: AllowanceRateType.FIXED,       isTaxable: true,  stpCategory: 'AD', description: 'Per coffin handled' },
    { code: 'MA38_OFFENSIVE_MATERIAL',  name: 'Offensive Material Allowance',        amount: '3.63',   rateType: AllowanceRateType.PER_DAY,     isTaxable: true,  stpCategory: 'AD', description: 'Work with offensive material' },
    { code: 'MA38_SANITARY_VEHICLE',    name: 'Sanitary Vehicle Allowance',          amount: '29.48',  rateType: AllowanceRateType.PER_WEEK,    isTaxable: true,  stpCategory: 'AD', description: 'Operating sanitary collection vehicles' },
  ]

  for (const a of allowances38) {
    await prisma.awardAllowanceRate.upsert({
      where: { code_effectiveFrom: { code: a.code, effectiveFrom: EFFECTIVE_38 } },
      update: { amount: a.amount, rateType: a.rateType },
      create: { award: AwardCode.MA000038, code: a.code, name: a.name, description: a.description, rateType: a.rateType, amount: a.amount, isTaxable: a.isTaxable, stpCategory: a.stpCategory, effectiveFrom: EFFECTIVE_38, source: SOURCE_38 },
    })
  }
  console.log(`  Seeded ${allowances38.length} MA000038 allowances`)

  // ── MA000039 allowances ─────────────────────────────────────────────────────
  const allowances39 = [
    { code: 'MA39_TRAVELLING',          name: 'Travelling Allowance',                amount: '56.28',  rateType: AllowanceRateType.FIXED,    isTaxable: false, stpCategory: 'AD', description: 'Per occasion away from home base' },
    { code: 'MA39_DANGEROUS_BULK',      name: 'Dangerous Goods — Bulk',              amount: '23.88',  rateType: AllowanceRateType.PER_DAY,  isTaxable: true,  stpCategory: 'AD', description: 'Carrying dangerous goods in bulk (not packaged)' },
    { code: 'MA39_DANGEROUS_PACKAGED',  name: 'Dangerous Goods — Packaged',          amount: '9.99',   rateType: AllowanceRateType.PER_DAY,  isTaxable: true,  stpCategory: 'AD', description: 'Carrying packaged dangerous goods' },
    { code: 'MA39_LONG_VEHICLE',        name: 'Long Vehicle Allowance',              amount: '4.63',   rateType: AllowanceRateType.PER_DAY,  isTaxable: true,  stpCategory: 'AD', description: 'Operating long vehicles' },
    { code: 'MA39_WIDE_VEHICLE',        name: 'Wide Vehicle Allowance',              amount: '4.63',   rateType: AllowanceRateType.PER_DAY,  isTaxable: true,  stpCategory: 'AD', description: 'Operating wide vehicles' },
    { code: 'MA39_TEMP_TRANSFER',       name: 'Temporary Transfer to Long Distance', amount: '13.04',  rateType: AllowanceRateType.FIXED,    isTaxable: true,  stpCategory: 'AD', description: 'Per occasion temporarily transferred to long distance driving' },
    { code: 'MA39_FURNITURE_CARTER',    name: 'Furniture Carter Allowance',          amount: '25.46',  rateType: AllowanceRateType.PER_WEEK, isTaxable: true,  stpCategory: 'AD', description: 'Furniture carter employees' },
    { code: 'MA39_LIVESTOCK',           name: 'Livestock Carter Allowance',          amount: '25.46',  rateType: AllowanceRateType.PER_WEEK, isTaxable: true,  stpCategory: 'AD', description: 'Livestock carter employees' },
  ]

  for (const a of allowances39) {
    await prisma.awardAllowanceRate.upsert({
      where: { code_effectiveFrom: { code: a.code, effectiveFrom: EFFECTIVE_39 } },
      update: { amount: a.amount, rateType: a.rateType },
      create: { award: AwardCode.MA000039, code: a.code, name: a.name, description: a.description, rateType: a.rateType, amount: a.amount, isTaxable: a.isTaxable, stpCategory: a.stpCategory, effectiveFrom: EFFECTIVE_39, source: SOURCE_39 },
    })
  }
  console.log(`  Seeded ${allowances39.length} MA000039 allowances`)

  // ── Superannuation rate ─────────────────────────────────────────────────────
  // 12% is the final scheduled rate under the Superannuation Guarantee (Administration) Act 1992.
  // It applies from 1 July 2025 and does not reduce thereafter.
  // Max super contribution base (quarterly) for FY2025-26: $65,070 (ATO published).
  await prisma.superannuationRate.upsert({
    where: { effectiveFrom: new Date('2025-07-01') },
    update: { rate: '0.1200', maxContributionBaseQuarterly: '65070.00' },
    create: { financialYear: '2025-26', rate: '0.1200', effectiveFrom: new Date('2025-07-01'), maxContributionBaseQuarterly: '65070.00', source: SOURCE_SUPER },
  })
  console.log('  Seeded superannuation rate: 12% (FY2025-26)')

  // ── PAYG tax brackets ───────────────────────────────────────────────────────
  // FY2025-26 — Australian resident, claiming tax-free threshold (Scale 2)
  // Formula: annual_withholding = (a × annual_taxable_income) - b
  // These are base marginal rates derived from the published tax brackets.
  // LITO (Low Income Tax Offset, max $700) and Medicare Levy (2%) are handled
  // separately in the withholding engine, not baked into these coefficients.
  //
  // ⚠ IMPORTANT: Verify the exact NAT 3539 ATO withholding coefficients at:
  //   https://www.ato.gov.au/calculators-and-tools/tax-withheld-calculator
  //   before using in production payroll runs.
  //
  // Tax brackets (FY2025-26, resident):
  //   $0–$18,200        → 0% (tax-free threshold)
  //   $18,201–$45,000   → 16%   base=$0        a=0.16  b=(0.16×18200 - 0)    = 2912
  //   $45,001–$135,000  → 30%   base=$4,288    a=0.30  b=(0.30×45000 - 4288) = 9212
  //   $135,001–$190,000 → 37%   base=$31,288   a=0.37  b=(0.37×135000 - 31288) = 18662
  //   $190,001+         → 45%   base=$51,638   a=0.45  b=(0.45×190000 - 51638) = 33862

  const FY = '2025-26'
  const PAYG_FROM = new Date('2025-07-01')

  const paygBrackets = [
    // Scale 2: resident, claims tax-free threshold
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: true, hasHECS: false, freq: PayFrequency.WEEKLY, from: 0,      to: 350.00,  a: '0.0000000', b: '0.0000000' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: true, hasHECS: false, freq: PayFrequency.WEEKLY, from: 350.04, to: 865.39,  a: '0.1600000', b: '56.0000000' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: true, hasHECS: false, freq: PayFrequency.WEEKLY, from: 865.40, to: 2596.15, a: '0.3000000', b: '177.1500000' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: true, hasHECS: false, freq: PayFrequency.WEEKLY, from: 2596.16, to: 3653.85, a: '0.3700000', b: '358.8846154' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: true, hasHECS: false, freq: PayFrequency.WEEKLY, from: 3653.86, to: null,    a: '0.4500000', b: '651.1923077' },
    // Scale 1: resident, does NOT claim tax-free threshold (no free threshold — tax from $0)
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 0,       to: 865.39,  a: '0.1900000', b: '0.1900000' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 865.40,  to: 2596.15, a: '0.3200000', b: '112.8900000' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 2596.16, to: 3653.85, a: '0.3700000', b: '242.7500000' },
    { residency: TaxResidencyStatus.RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 3653.86, to: null,    a: '0.4500000', b: '534.9038462' },
    // Scale 3: Foreign Residents — no tax-free threshold, no LITO, no Medicare Levy
    // Annual brackets: $0–$135k @30%, $135k–$190k @37%, $190k+ @45%
    // Weekly: a×w − b where b = (prior_bracket_tax / 52) adjusted for weekly basis
    { residency: TaxResidencyStatus.FOREIGN_RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 0,       to: 2596.15, a: '0.3000000', b: '0.0000000' },
    { residency: TaxResidencyStatus.FOREIGN_RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 2596.16, to: 3653.85, a: '0.3700000', b: '181.7308000' },
    { residency: TaxResidencyStatus.FOREIGN_RESIDENT, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 3653.86, to: null,    a: '0.4500000', b: '473.9615000' },
    // Scale 6: Working Holiday Makers
    // Annual brackets: $0–$45k @15%, $45k–$135k @30%, $135k–$190k @37%, $190k+ @45%
    { residency: TaxResidencyStatus.WORKING_HOLIDAY_MAKER, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 0,       to: 865.38,  a: '0.1500000', b: '0.0000000' },
    { residency: TaxResidencyStatus.WORKING_HOLIDAY_MAKER, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 865.40,  to: 2596.15, a: '0.3000000', b: '129.8077000' },
    { residency: TaxResidencyStatus.WORKING_HOLIDAY_MAKER, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 2596.16, to: 3653.85, a: '0.3700000', b: '311.5385000' },
    { residency: TaxResidencyStatus.WORKING_HOLIDAY_MAKER, tfThreshold: false, hasHECS: false, freq: PayFrequency.WEEKLY, from: 3653.86, to: null,    a: '0.4500000', b: '603.8462000' },
  ]

  // Delete existing FY2025-26 brackets before re-seeding (idempotent)
  await prisma.paygTaxBracket.deleteMany({ where: { financialYear: FY } })
  await prisma.paygTaxBracket.createMany({
    data: paygBrackets.map(b => ({
      financialYear: FY,
      taxResidencyStatus: b.residency,
      claimsTaxFreeThreshold: b.tfThreshold,
      hasHECS: b.hasHECS,
      payFrequency: b.freq,
      annualEarningsFrom: b.from,
      annualEarningsTo: b.to,
      coefficientA: b.a,
      coefficientB: b.b,
      effectiveFrom: PAYG_FROM,
      source: SOURCE_PAYG,
    })),
  })
  console.log(`  Seeded ${paygBrackets.length} PAYG tax brackets (FY${FY}) — ⚠ verify NAT 3539 coefficients`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
