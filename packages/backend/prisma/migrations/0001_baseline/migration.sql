-- CreateEnum
CREATE TYPE "AustralianState" AS ENUM ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('HOURLY', 'SALARY', 'PER_KM', 'PER_LOAD', 'PERCENTAGE_REVENUE', 'MIXED');

-- CreateEnum
CREATE TYPE "AwardCode" AS ENUM ('MA000038', 'MA000039');

-- CreateEnum
CREATE TYPE "AwardClassificationLevel" AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5');

-- CreateEnum
CREATE TYPE "VehicleGrade" AS ENUM ('LIGHT_RIGID', 'MEDIUM_RIGID', 'HEAVY_RIGID', 'ARTICULATED', 'COMBINATION');

-- CreateEnum
CREATE TYPE "TaxResidencyStatus" AS ENUM ('RESIDENT', 'FOREIGN_RESIDENT', 'WORKING_HOLIDAY_MAKER');

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'ORG_USER');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER', 'SUPERVISOR', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PayRunStatus" AS ENUM ('DRAFT', 'PREVIEW', 'APPROVED', 'FINALISED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayRunItemStatus" AS ENUM ('PENDING', 'ADJUSTED', 'FINALISED');

-- CreateEnum
CREATE TYPE "STPStatus" AS ENUM ('PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EarningType" AS ENUM ('ORDINARY', 'OVERTIME_1_5X', 'OVERTIME_2X', 'PUBLIC_HOLIDAY', 'NIGHT_PENALTY', 'WEEKEND_PENALTY', 'EARLY_MORNING_PENALTY', 'AFTERNOON_PENALTY', 'PER_KM', 'PER_LOAD', 'ANNUAL_LEAVE', 'ANNUAL_LEAVE_LOADING', 'PERSONAL_LEAVE', 'LONG_SERVICE_LEAVE', 'TERMINATION_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'PERSONAL_CARERS', 'COMPASSIONATE', 'COMMUNITY_SERVICE', 'LONG_SERVICE', 'PARENTAL', 'UNPAID', 'PUBLIC_HOLIDAY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('PAID', 'UNPAID', 'MEAL', 'REST');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('UNAVAILABLE', 'PREFERRED_OFF', 'AVAILABLE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "KmLogStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FUEL', 'TOLL', 'PARKING', 'ACCOMMODATION', 'MEAL_ALLOWANCE', 'PHONE', 'UNIFORM', 'TOOLS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "AllowanceRateType" AS ENUM ('FIXED', 'PER_KM', 'PER_DAY', 'PER_HOUR', 'PER_NIGHT');

-- CreateEnum
CREATE TYPE "PenaltyRateType" AS ENUM ('SATURDAY', 'SUNDAY', 'PUBLIC_HOLIDAY', 'OVERTIME_1_5X', 'OVERTIME_2X', 'NIGHT_SHIFT', 'EARLY_MORNING', 'AFTERNOON_SHIFT', 'ROSTERED_DAY_OFF');

-- CreateEnum
CREATE TYPE "SubcontractorEntityType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "SubcontractorContractType" AS ENUM ('RATE_PER_KM', 'RATE_PER_LOAD', 'FIXED_WEEKLY', 'MIXED');

-- CreateEnum
CREATE TYPE "SubcontractorPaymentStatus" AS ENUM ('DRAFT', 'PENDING', 'PROCESSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'SECURITY', 'MEDICAL');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DISPUTED', 'CLOSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('XERO', 'MYOB', 'QUICKBOOKS', 'DEPUTY', 'KEYPAY');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3');

-- CreateEnum
CREATE TYPE "LicenceClass" AS ENUM ('C', 'LR', 'MR', 'HR', 'HC', 'MC');

-- CreateEnum
CREATE TYPE "AccreditationType" AS ENUM ('DANGEROUS_GOODS', 'HEAVY_VEHICLE_MASS_MANAGEMENT', 'HEAVY_VEHICLE_MAINTENANCE', 'BASIC_FATIGUE_MANAGEMENT', 'ADVANCED_FATIGUE_MANAGEMENT', 'FORKLIFT', 'FIRST_AID', 'WHITE_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicalCertType" AS ENUM ('COMMERCIAL_VEHICLE_DRIVER', 'DANGEROUS_GOODS_DRIVER', 'ANNUAL_MEDICAL');

-- CreateEnum
CREATE TYPE "FatigueScheme" AS ENUM ('STANDARD_HOURS', 'BASIC_FATIGUE_MANAGEMENT', 'ADVANCED_FATIGUE_MANAGEMENT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('EMPLOYMENT_CONTRACT', 'LICENCE', 'MEDICAL_CERTIFICATE', 'ACCREDITATION', 'TAX_DECLARATION', 'BANK_DETAILS', 'INDUCTION', 'ENTERPRISE_AGREEMENT', 'SUBCONTRACTOR_CONTRACT', 'INCIDENT_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PAY_RUN_CREATED', 'PAY_RUN_FINALISED', 'PAY_RUN_CANCELLED', 'LEAVE_APPROVED', 'LEAVE_DECLINED', 'TIMESHEET_APPROVED', 'ROSTER_PUBLISHED', 'EXPORT_GENERATED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'INCIDENT_REPORTED', 'API_KEY_CREATED', 'API_KEY_REVOKED', 'PORTAL_ACCESS_GRANTED', 'PORTAL_ACCESS_REVOKED', 'SUBCONTRACTOR_PAYMENT_PROCESSED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "billingEmail" TEXT,
    "billingName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "abn" TEXT NOT NULL,
    "acn" TEXT,
    "logoKey" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "payrollContactName" TEXT,
    "payrollContactEmail" TEXT,
    "payrollContactPhone" TEXT,
    "bankBsb" TEXT,
    "bankAccount" TEXT,
    "bankAccountName" TEXT,
    "bankAbbreviation" TEXT,
    "bankUserId" TEXT,
    "stpSoftwareId" TEXT,
    "stpBranchNumber" INTEGER NOT NULL DEFAULT 1,
    "addressStreet" TEXT,
    "addressSuburb" TEXT,
    "addressState" "AustralianState",
    "addressPostcode" TEXT,
    "workCoverPolicyNumber" TEXT,
    "workCoverInsurer" TEXT,
    "payrollTaxRegistered" BOOLEAN NOT NULL DEFAULT false,
    "payrollTaxState" "AustralianState",
    "defaultPayFrequency" "PayFrequency" NOT NULL DEFAULT 'WEEKLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "addressStreet" TEXT,
    "addressSuburb" TEXT,
    "addressState" "AustralianState",
    "addressPostcode" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "depots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'ORG_USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "depotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_company_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "depotId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "addressStreet" TEXT,
    "addressSuburb" TEXT,
    "addressState" "AustralianState",
    "addressPostcode" TEXT,
    "addressCountry" TEXT NOT NULL DEFAULT 'AU',
    "position" TEXT,
    "employmentType" "EmploymentType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "probationEndDate" TIMESTAMP(3),
    "noticePeriodWeeks" INTEGER,
    "awardCode" "AwardCode",
    "enterpriseAgreementId" TEXT,
    "payFrequency" "PayFrequency" NOT NULL,
    "taxFileNumber" TEXT,
    "taxResidencyStatus" "TaxResidencyStatus" NOT NULL DEFAULT 'RESIDENT',
    "claimsTaxFreeThreshold" BOOLEAN NOT NULL DEFAULT true,
    "hasHECSDebt" BOOLEAN NOT NULL DEFAULT false,
    "hasSFSSDebt" BOOLEAN NOT NULL DEFAULT false,
    "taxDeclarationDate" TIMESTAMP(3),
    "superFundName" TEXT,
    "superFundAbn" TEXT,
    "superMemberNumber" TEXT,
    "superFundUsi" TEXT,
    "workCoverClassCode" TEXT,
    "inductionCompletedAt" TIMESTAMP(3),
    "reportsToId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_pay_rates" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "payType" "PayType" NOT NULL,
    "hourlyRate" DECIMAL(10,4),
    "ratePerKm" DECIMAL(10,4),
    "ratePerLoad" DECIMAL(10,2),
    "revenuePercentage" DECIMAL(5,4),
    "annualSalary" DECIMAL(12,2),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_award_classifications" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "awardCode" "AwardCode" NOT NULL,
    "classificationLevel" "AwardClassificationLevel" NOT NULL,
    "vehicleGrade" "VehicleGrade",
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_award_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "bsb" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "allocationPercent" DECIMAL(5,2),
    "allocationAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "expiryDate" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_agreements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fwoAeaNumber" TEXT,
    "commencementDate" DATE NOT NULL,
    "expiryDate" DATE,
    "documentKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_runs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "payFrequency" "PayFrequency" NOT NULL,
    "periodStartDate" DATE NOT NULL,
    "periodEndDate" DATE NOT NULL,
    "payDate" DATE NOT NULL,
    "status" "PayRunStatus" NOT NULL DEFAULT 'DRAFT',
    "sgRate" DECIMAL(5,4) NOT NULL DEFAULT 0.12,
    "totalGross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalSuper" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEmployeeCount" INTEGER NOT NULL DEFAULT 0,
    "abaFileKey" TEXT,
    "abaGeneratedAt" TIMESTAMP(3),
    "stpEventId" TEXT,
    "stpSubmittedAt" TIMESTAMP(3),
    "stpStatus" "STPStatus",
    "notes" TEXT,
    "finalisedAt" TIMESTAMP(3),
    "finalisedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_run_items" (
    "id" TEXT NOT NULL,
    "payRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ordinaryEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtimeEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltyEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowancesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nonTaxableAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leavePaidTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leavePaidLoading" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "preTaxDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableIncome" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paygWithholding" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medicareLevy" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "postTaxDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "superGuarantee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "voluntarySuper" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ytdGross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ytdTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ytdSuper" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ordinaryHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "payslipFileKey" TEXT,
    "payslipGeneratedAt" TIMESTAMP(3),
    "status" "PayRunItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_run_earnings" (
    "id" TEXT NOT NULL,
    "payRunItemId" TEXT NOT NULL,
    "earningType" "EarningType" NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(8,2),
    "rate" DECIMAL(10,4),
    "units" DECIMAL(10,3),
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pay_run_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowance_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "stpCategory" TEXT,
    "defaultAmount" DECIMAL(10,2),
    "isPerDiem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowance_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_run_allowance_items" (
    "id" TEXT NOT NULL,
    "payRunItemId" TEXT NOT NULL,
    "allowanceTypeId" TEXT NOT NULL,
    "units" DECIMAL(10,3),
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pay_run_allowance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deduction_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPreTax" BOOLEAN NOT NULL DEFAULT false,
    "stpCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deduction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_run_deduction_items" (
    "id" TEXT NOT NULL,
    "payRunItemId" TEXT NOT NULL,
    "deductionTypeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pay_run_deduction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_run_leave_items" (
    "id" TEXT NOT NULL,
    "payRunItemId" TEXT NOT NULL,
    "leaveRequestId" TEXT,
    "leaveType" "LeaveType" NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "loadingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "pay_run_leave_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_base_rates" (
    "id" TEXT NOT NULL,
    "award" "AwardCode" NOT NULL,
    "classificationLevel" "AwardClassificationLevel" NOT NULL,
    "vehicleGrade" "VehicleGrade",
    "weeklyRate" DECIMAL(10,4) NOT NULL,
    "hourlyRate" DECIMAL(10,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_base_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_allowance_rates" (
    "id" TEXT NOT NULL,
    "award" "AwardCode",
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rateType" "AllowanceRateType" NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "stpCategory" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_allowance_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_penalty_rates" (
    "id" TEXT NOT NULL,
    "award" "AwardCode" NOT NULL,
    "penaltyType" "PenaltyRateType" NOT NULL,
    "multiplier" DECIMAL(5,4) NOT NULL,
    "classificationLevel" "AwardClassificationLevel",
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "award_penalty_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payg_tax_brackets" (
    "id" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "taxResidencyStatus" "TaxResidencyStatus" NOT NULL,
    "claimsTaxFreeThreshold" BOOLEAN NOT NULL,
    "hasHECS" BOOLEAN NOT NULL DEFAULT false,
    "payFrequency" "PayFrequency" NOT NULL,
    "annualEarningsFrom" DECIMAL(10,2) NOT NULL,
    "annualEarningsTo" DECIMAL(10,2),
    "coefficientA" DECIMAL(14,7) NOT NULL,
    "coefficientB" DECIMAL(14,7) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payg_tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "superannuation_rates" (
    "id" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "maxContributionBaseQuarterly" DECIMAL(12,2),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "superannuation_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheets" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "totalOrdinaryHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "totalOvertimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "totalHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "payRunItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_entries" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "clockInLat" DECIMAL(10,7),
    "clockInLng" DECIMAL(10,7),
    "clockOutLat" DECIMAL(10,7),
    "clockOutLng" DECIMAL(10,7),
    "ordinaryHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "totalHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "costCentre" TEXT,
    "depotId" TEXT,
    "notes" TEXT,
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_breaks" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "breakType" "BreakType" NOT NULL DEFAULT 'UNPAID',

    CONSTRAINT "timesheet_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "km_logs" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "kilometres" DECIMAL(10,2) NOT NULL,
    "originAddress" TEXT,
    "destinationAddress" TEXT,
    "mapsRouteDescription" TEXT,
    "vehicleRego" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "status" "KmLogStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "payRunItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "km_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_claims" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "claimDate" DATE NOT NULL,
    "expenseType" "ExpenseType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "gstAmount" DECIMAL(10,2),
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "receiptKey" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "payRunItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "accrued" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "used" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pending" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastAccrualDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" DECIMAL(8,2) NOT NULL,
    "totalHours" DECIMAL(8,2) NOT NULL,
    "reason" TEXT,
    "supportingDoc" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "state" "AustralianState",
    "year" INTEGER NOT NULL,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "depotId" TEXT,
    "name" TEXT,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "status" "RosterStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_shifts" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "employeeId" TEXT,
    "shiftDate" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT,
    "runCode" TEXT,
    "depotId" TEXT,
    "costCentre" TEXT,
    "notes" TEXT,
    "hasConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictDetails" JSONB,
    "estimatedCost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "depotId" TEXT,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "runCode" TEXT,
    "vehicleType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_availabilities" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "availabilityType" "AvailabilityType" NOT NULL,
    "reason" TEXT,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rego" TEXT NOT NULL,
    "regoState" "AustralianState" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vehicleGrade" "VehicleGrade",
    "colour" TEXT,
    "grossVehicleMass" INTEGER,
    "tare" INTEGER,
    "regoExpiry" DATE,
    "nextServiceDate" DATE,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" DATE,
    "gpsDeviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_records" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "serviceType" TEXT NOT NULL,
    "odometerKm" INTEGER,
    "costCents" INTEGER,
    "providerName" TEXT,
    "notes" TEXT,
    "documentKey" TEXT,
    "nextServiceDate" DATE,
    "nextServiceOdoKm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_incidents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "incidentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "driverEmployeeId" TEXT,
    "location" TEXT,
    "policeReportNumber" TEXT,
    "insuranceClaimNumber" TEXT,
    "estimatedDamageCents" INTEGER,
    "documentKeys" TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "SubcontractorEntityType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "businessName" TEXT,
    "tradingName" TEXT,
    "abn" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "addressStreet" TEXT,
    "addressSuburb" TEXT,
    "addressState" "AustralianState",
    "addressPostcode" TEXT,
    "bankBsb" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "voluntaryWithholdingRate" DECIMAL(5,4),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_contracts" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "contractType" "SubcontractorContractType" NOT NULL,
    "ratePerKm" DECIMAL(10,4),
    "ratePerLoad" DECIMAL(10,2),
    "fixedWeeklyRate" DECIMAL(12,2),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "documentKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_vehicles" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "rego" TEXT NOT NULL,
    "regoState" "AustralianState" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vehicleGrade" "VehicleGrade",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_payments" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStartDate" DATE NOT NULL,
    "periodEndDate" DATE NOT NULL,
    "paymentDate" DATE NOT NULL,
    "totalKilometres" DECIMAL(10,2),
    "totalLoads" INTEGER,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "withholdingTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayment" DECIMAL(12,2) NOT NULL,
    "status" "SubcontractorPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" TEXT,
    "abaFileKey" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_payment_lines" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitRate" DECIMAL(10,4) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "runDate" DATE,
    "runCode" TEXT,

    CONSTRAINT "subcontractor_payment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workplace_incidents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "incidentType" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "involvedEmployeeId" TEXT,
    "injuryDescription" TEXT,
    "treatmentProvided" TEXT,
    "lostTimeInjury" BOOLEAN NOT NULL DEFAULT false,
    "returnToWorkDate" DATE,
    "reportedToSafeworkAt" TIMESTAMP(3),
    "safeworkRefNumber" TEXT,
    "notifiableIncident" BOOLEAN NOT NULL DEFAULT false,
    "documentKeys" TEXT[],
    "workersCompClaimId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workplace_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers_comp_claims" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "claimNumber" TEXT,
    "insurer" TEXT,
    "injuryDate" DATE NOT NULL,
    "injuryType" TEXT NOT NULL,
    "bodyPart" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'OPEN',
    "rtpDate" DATE,
    "weeklyBenefitCents" INTEGER,
    "documentKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_comp_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_licences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "licenceState" "AustralianState" NOT NULL,
    "licenceClasses" "LicenceClass"[],
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "restrictions" TEXT,
    "documentKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_licences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accreditations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "accreditationType" "AccreditationType" NOT NULL,
    "certificateNumber" TEXT,
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE,
    "issuingBody" TEXT,
    "documentKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accreditations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_certificates" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "certType" "MedicalCertType" NOT NULL,
    "issuingDoctor" TEXT,
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "restrictions" TEXT,
    "documentKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatigue_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "workStartTime" TIMESTAMP(3) NOT NULL,
    "workEndTime" TIMESTAMP(3),
    "workMinutes" INTEGER,
    "restStartTime" TIMESTAMP(3),
    "restEndTime" TIMESTAMP(3),
    "restMinutes" INTEGER,
    "locationStart" TEXT,
    "locationEnd" TEXT,
    "fatigueScheme" "FatigueScheme" NOT NULL DEFAULT 'STANDARD_HOURS',
    "isCompliant" BOOLEAN NOT NULL DEFAULT true,
    "violationType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fatigue_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingName" TEXT NOT NULL,
    "trainingType" TEXT,
    "completedDate" DATE NOT NULL,
    "expiryDate" DATE,
    "documentKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxEmployees" INTEGER,
    "maxCompanies" INTEGER,
    "maxDepots" INTEGER,
    "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasWebhooks" BOOLEAN NOT NULL DEFAULT false,
    "hasSso" BOOLEAN NOT NULL DEFAULT false,
    "hasWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancedReports" BOOLEAN NOT NULL DEFAULT false,
    "hasSubcontractors" BOOLEAN NOT NULL DEFAULT true,
    "monthlyPriceCents" INTEGER NOT NULL,
    "annualPriceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_tokens" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "tenantName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "mappingType" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "succeededAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "companyId" TEXT,
    "userId" TEXT,
    "employeeId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_abn_key" ON "companies"("abn");

-- CreateIndex
CREATE INDEX "companies_organizationId_idx" ON "companies"("organizationId");

-- CreateIndex
CREATE INDEX "depots_companyId_idx" ON "depots"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "depots_companyId_code_key" ON "depots"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_company_access_userId_idx" ON "user_company_access"("userId");

-- CreateIndex
CREATE INDEX "user_company_access_companyId_idx" ON "user_company_access"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_access_userId_companyId_key" ON "user_company_access"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");

-- CreateIndex
CREATE INDEX "employees_depotId_idx" ON "employees"("depotId");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_employeeNumber_key" ON "employees"("companyId", "employeeNumber");

-- CreateIndex
CREATE INDEX "employee_pay_rates_employeeId_idx" ON "employee_pay_rates"("employeeId");

-- CreateIndex
CREATE INDEX "employee_pay_rates_effectiveFrom_idx" ON "employee_pay_rates"("effectiveFrom");

-- CreateIndex
CREATE INDEX "employee_award_classifications_employeeId_idx" ON "employee_award_classifications"("employeeId");

-- CreateIndex
CREATE INDEX "bank_accounts_employeeId_idx" ON "bank_accounts"("employeeId");

-- CreateIndex
CREATE INDEX "emergency_contacts_employeeId_idx" ON "emergency_contacts"("employeeId");

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "employee_documents"("employeeId");

-- CreateIndex
CREATE INDEX "enterprise_agreements_companyId_idx" ON "enterprise_agreements"("companyId");

-- CreateIndex
CREATE INDEX "pay_runs_companyId_idx" ON "pay_runs"("companyId");

-- CreateIndex
CREATE INDEX "pay_runs_periodStartDate_periodEndDate_idx" ON "pay_runs"("periodStartDate", "periodEndDate");

-- CreateIndex
CREATE INDEX "pay_runs_status_idx" ON "pay_runs"("status");

-- CreateIndex
CREATE INDEX "pay_run_items_payRunId_idx" ON "pay_run_items"("payRunId");

-- CreateIndex
CREATE INDEX "pay_run_items_employeeId_idx" ON "pay_run_items"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_run_items_payRunId_employeeId_key" ON "pay_run_items"("payRunId", "employeeId");

-- CreateIndex
CREATE INDEX "pay_run_earnings_payRunItemId_idx" ON "pay_run_earnings"("payRunItemId");

-- CreateIndex
CREATE INDEX "allowance_types_companyId_idx" ON "allowance_types"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "allowance_types_companyId_code_key" ON "allowance_types"("companyId", "code");

-- CreateIndex
CREATE INDEX "pay_run_allowance_items_payRunItemId_idx" ON "pay_run_allowance_items"("payRunItemId");

-- CreateIndex
CREATE INDEX "deduction_types_companyId_idx" ON "deduction_types"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "deduction_types_companyId_code_key" ON "deduction_types"("companyId", "code");

-- CreateIndex
CREATE INDEX "pay_run_deduction_items_payRunItemId_idx" ON "pay_run_deduction_items"("payRunItemId");

-- CreateIndex
CREATE INDEX "pay_run_leave_items_payRunItemId_idx" ON "pay_run_leave_items"("payRunItemId");

-- CreateIndex
CREATE INDEX "award_base_rates_award_classificationLevel_idx" ON "award_base_rates"("award", "classificationLevel");

-- CreateIndex
CREATE INDEX "award_base_rates_effectiveFrom_idx" ON "award_base_rates"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "award_base_rates_award_classificationLevel_vehicleGrade_eff_key" ON "award_base_rates"("award", "classificationLevel", "vehicleGrade", "effectiveFrom");

-- CreateIndex
CREATE INDEX "award_allowance_rates_award_idx" ON "award_allowance_rates"("award");

-- CreateIndex
CREATE INDEX "award_allowance_rates_effectiveFrom_idx" ON "award_allowance_rates"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "award_allowance_rates_code_effectiveFrom_key" ON "award_allowance_rates"("code", "effectiveFrom");

-- CreateIndex
CREATE INDEX "award_penalty_rates_award_penaltyType_idx" ON "award_penalty_rates"("award", "penaltyType");

-- CreateIndex
CREATE INDEX "award_penalty_rates_effectiveFrom_idx" ON "award_penalty_rates"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "award_penalty_rates_award_penaltyType_classificationLevel_e_key" ON "award_penalty_rates"("award", "penaltyType", "classificationLevel", "effectiveFrom");

-- CreateIndex
CREATE INDEX "payg_tax_brackets_financialYear_taxResidencyStatus_claimsTa_idx" ON "payg_tax_brackets"("financialYear", "taxResidencyStatus", "claimsTaxFreeThreshold", "hasHECS", "payFrequency");

-- CreateIndex
CREATE INDEX "payg_tax_brackets_effectiveFrom_idx" ON "payg_tax_brackets"("effectiveFrom");

-- CreateIndex
CREATE INDEX "superannuation_rates_effectiveFrom_idx" ON "superannuation_rates"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "superannuation_rates_effectiveFrom_key" ON "superannuation_rates"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "timesheets_payRunItemId_key" ON "timesheets"("payRunItemId");

-- CreateIndex
CREATE INDEX "timesheets_employeeId_idx" ON "timesheets"("employeeId");

-- CreateIndex
CREATE INDEX "timesheets_weekStartDate_idx" ON "timesheets"("weekStartDate");

-- CreateIndex
CREATE INDEX "timesheets_status_idx" ON "timesheets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "timesheets_employeeId_weekStartDate_key" ON "timesheets"("employeeId", "weekStartDate");

-- CreateIndex
CREATE INDEX "timesheet_entries_timesheetId_idx" ON "timesheet_entries"("timesheetId");

-- CreateIndex
CREATE INDEX "timesheet_entries_entryDate_idx" ON "timesheet_entries"("entryDate");

-- CreateIndex
CREATE INDEX "timesheet_breaks_entryId_idx" ON "timesheet_breaks"("entryId");

-- CreateIndex
CREATE INDEX "km_logs_employeeId_idx" ON "km_logs"("employeeId");

-- CreateIndex
CREATE INDEX "km_logs_logDate_idx" ON "km_logs"("logDate");

-- CreateIndex
CREATE INDEX "km_logs_status_idx" ON "km_logs"("status");

-- CreateIndex
CREATE INDEX "expense_claims_employeeId_idx" ON "expense_claims"("employeeId");

-- CreateIndex
CREATE INDEX "expense_claims_companyId_idx" ON "expense_claims"("companyId");

-- CreateIndex
CREATE INDEX "expense_claims_claimDate_idx" ON "expense_claims"("claimDate");

-- CreateIndex
CREATE INDEX "expense_claims_status_idx" ON "expense_claims"("status");

-- CreateIndex
CREATE INDEX "leave_balances_employeeId_idx" ON "leave_balances"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employeeId_leaveType_key" ON "leave_balances"("employeeId", "leaveType");

-- CreateIndex
CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "public_holidays_year_state_idx" ON "public_holidays"("year", "state");

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_state_key" ON "public_holidays"("date", "state");

-- CreateIndex
CREATE INDEX "rosters_companyId_idx" ON "rosters"("companyId");

-- CreateIndex
CREATE INDEX "rosters_weekStartDate_idx" ON "rosters"("weekStartDate");

-- CreateIndex
CREATE INDEX "roster_shifts_rosterId_idx" ON "roster_shifts"("rosterId");

-- CreateIndex
CREATE INDEX "roster_shifts_employeeId_idx" ON "roster_shifts"("employeeId");

-- CreateIndex
CREATE INDEX "roster_shifts_shiftDate_idx" ON "roster_shifts"("shiftDate");

-- CreateIndex
CREATE INDEX "shift_templates_companyId_idx" ON "shift_templates"("companyId");

-- CreateIndex
CREATE INDEX "employee_availabilities_employeeId_idx" ON "employee_availabilities"("employeeId");

-- CreateIndex
CREATE INDEX "employee_availabilities_fromDate_toDate_idx" ON "employee_availabilities"("fromDate", "toDate");

-- CreateIndex
CREATE INDEX "vehicles_companyId_idx" ON "vehicles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_companyId_rego_key" ON "vehicles"("companyId", "rego");

-- CreateIndex
CREATE INDEX "vehicle_service_records_vehicleId_idx" ON "vehicle_service_records"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_service_records_serviceDate_idx" ON "vehicle_service_records"("serviceDate");

-- CreateIndex
CREATE INDEX "vehicle_incidents_vehicleId_idx" ON "vehicle_incidents"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_incidents_incidentDate_idx" ON "vehicle_incidents"("incidentDate");

-- CreateIndex
CREATE INDEX "subcontractors_companyId_idx" ON "subcontractors"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractors_companyId_abn_key" ON "subcontractors"("companyId", "abn");

-- CreateIndex
CREATE INDEX "subcontractor_contracts_subcontractorId_idx" ON "subcontractor_contracts"("subcontractorId");

-- CreateIndex
CREATE INDEX "subcontractor_contracts_effectiveFrom_idx" ON "subcontractor_contracts"("effectiveFrom");

-- CreateIndex
CREATE INDEX "subcontractor_vehicles_subcontractorId_idx" ON "subcontractor_vehicles"("subcontractorId");

-- CreateIndex
CREATE INDEX "subcontractor_payments_subcontractorId_idx" ON "subcontractor_payments"("subcontractorId");

-- CreateIndex
CREATE INDEX "subcontractor_payments_companyId_idx" ON "subcontractor_payments"("companyId");

-- CreateIndex
CREATE INDEX "subcontractor_payments_periodStartDate_idx" ON "subcontractor_payments"("periodStartDate");

-- CreateIndex
CREATE INDEX "subcontractor_payment_lines_paymentId_idx" ON "subcontractor_payment_lines"("paymentId");

-- CreateIndex
CREATE INDEX "workplace_incidents_companyId_idx" ON "workplace_incidents"("companyId");

-- CreateIndex
CREATE INDEX "workplace_incidents_incidentDate_idx" ON "workplace_incidents"("incidentDate");

-- CreateIndex
CREATE INDEX "workers_comp_claims_employeeId_idx" ON "workers_comp_claims"("employeeId");

-- CreateIndex
CREATE INDEX "workers_comp_claims_companyId_idx" ON "workers_comp_claims"("companyId");

-- CreateIndex
CREATE INDEX "driver_licences_employeeId_idx" ON "driver_licences"("employeeId");

-- CreateIndex
CREATE INDEX "driver_licences_expiryDate_idx" ON "driver_licences"("expiryDate");

-- CreateIndex
CREATE INDEX "accreditations_employeeId_idx" ON "accreditations"("employeeId");

-- CreateIndex
CREATE INDEX "accreditations_expiryDate_idx" ON "accreditations"("expiryDate");

-- CreateIndex
CREATE INDEX "medical_certificates_employeeId_idx" ON "medical_certificates"("employeeId");

-- CreateIndex
CREATE INDEX "medical_certificates_expiryDate_idx" ON "medical_certificates"("expiryDate");

-- CreateIndex
CREATE INDEX "fatigue_records_employeeId_idx" ON "fatigue_records"("employeeId");

-- CreateIndex
CREATE INDEX "fatigue_records_recordDate_idx" ON "fatigue_records"("recordDate");

-- CreateIndex
CREATE INDEX "training_records_employeeId_idx" ON "training_records"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_subscriptions_organizationId_key" ON "organization_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "organization_subscriptions_organizationId_idx" ON "organization_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "integration_tokens_organizationId_idx" ON "integration_tokens"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_tokens_organizationId_provider_key" ON "integration_tokens"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "integration_mappings_organizationId_provider_idx" ON "integration_mappings"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "integration_mappings_organizationId_provider_mappingType_lo_key" ON "integration_mappings"("organizationId", "provider", "mappingType", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "webhook_endpoints_organizationId_idx" ON "webhook_endpoints"("organizationId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries"("endpointId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_createdAt_idx" ON "webhook_deliveries"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depots" ADD CONSTRAINT "depots_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "depots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_award_classifications" ADD CONSTRAINT "employee_award_classifications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_agreements" ADD CONSTRAINT "enterprise_agreements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_runs" ADD CONSTRAINT "pay_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_items" ADD CONSTRAINT "pay_run_items_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "pay_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_items" ADD CONSTRAINT "pay_run_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_earnings" ADD CONSTRAINT "pay_run_earnings_payRunItemId_fkey" FOREIGN KEY ("payRunItemId") REFERENCES "pay_run_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowance_types" ADD CONSTRAINT "allowance_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_allowance_items" ADD CONSTRAINT "pay_run_allowance_items_payRunItemId_fkey" FOREIGN KEY ("payRunItemId") REFERENCES "pay_run_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_allowance_items" ADD CONSTRAINT "pay_run_allowance_items_allowanceTypeId_fkey" FOREIGN KEY ("allowanceTypeId") REFERENCES "allowance_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deduction_types" ADD CONSTRAINT "deduction_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_deduction_items" ADD CONSTRAINT "pay_run_deduction_items_payRunItemId_fkey" FOREIGN KEY ("payRunItemId") REFERENCES "pay_run_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_deduction_items" ADD CONSTRAINT "pay_run_deduction_items_deductionTypeId_fkey" FOREIGN KEY ("deductionTypeId") REFERENCES "deduction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_leave_items" ADD CONSTRAINT "pay_run_leave_items_payRunItemId_fkey" FOREIGN KEY ("payRunItemId") REFERENCES "pay_run_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_run_leave_items" ADD CONSTRAINT "pay_run_leave_items_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_breaks" ADD CONSTRAINT "timesheet_breaks_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "timesheet_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "km_logs" ADD CONSTRAINT "km_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_shifts" ADD CONSTRAINT "roster_shifts_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_shifts" ADD CONSTRAINT "roster_shifts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_shifts" ADD CONSTRAINT "roster_shifts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_availabilities" ADD CONSTRAINT "employee_availabilities_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_records" ADD CONSTRAINT "vehicle_service_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_incidents" ADD CONSTRAINT "vehicle_incidents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_contracts" ADD CONSTRAINT "subcontractor_contracts_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_vehicles" ADD CONSTRAINT "subcontractor_vehicles_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_payments" ADD CONSTRAINT "subcontractor_payments_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_payment_lines" ADD CONSTRAINT "subcontractor_payment_lines_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "subcontractor_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_incidents" ADD CONSTRAINT "workplace_incidents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_incidents" ADD CONSTRAINT "workplace_incidents_involvedEmployeeId_fkey" FOREIGN KEY ("involvedEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers_comp_claims" ADD CONSTRAINT "workers_comp_claims_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_licences" ADD CONSTRAINT "driver_licences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accreditations" ADD CONSTRAINT "accreditations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatigue_records" ADD CONSTRAINT "fatigue_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

