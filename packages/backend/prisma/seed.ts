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

  await seedRates()

  console.log('\nSeed complete.')
  console.log('\nLogin credentials:')
  console.log('  Admin:   admin@demo.freightpayroll.com.au / Password123!')
  console.log('  Payroll: payroll@demo.freightpayroll.com.au / Password123!')
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
// PAYG brackets: FY2025-26 income tax brackets (Stage 3 cuts, unchanged from 2024-25)
//   Source: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
//   Coefficients a and b satisfy: annual_tax = a × annual_income - b
//   LITO is applied separately in the withholding engine — these are base marginal rates only.
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
