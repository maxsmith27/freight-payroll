# FreightPayroll — Iteration Backlog

This document tracks features deferred from the initial build. Items are grouped by module and approximate priority.

---

## Phase 2 — Owner-Operators

The owner-operator (subcontractor) module was explicitly deferred. Required work:

- [ ] `OwnerOperator` entity: ABN, business name, bank details, insurance details, contractor agreement
- [ ] Per-trip / per-km / per-load invoicing rather than payroll slips
- [ ] PAYG withholding flag (voluntary withholding agreement)
- [ ] Contractor super via PAYG vs voluntary opt-in
- [ ] Owner-operator STP finalisation (separate from employee STP)
- [ ] Invoice generation PDF (not payslip)
- [ ] Owner-op compliance: vehicle rego, CTP, public liability expiry tracking

---

## Payroll Engine

- [ ] **STP actual submission** — XBRL packaging, ATO SBR2 endpoint, digital signing via AUSkey/myGovID; requires Novatti or similar intermediary integration
- [ ] **Single Touch Payroll Phase 2 validation** — validate disaggregated income types against ATO schema before generating payload
- [ ] **EOFY finalisation workflow** — UI to mark all employees finalised, generate finalisation payload, mark STP event as submitted
- [ ] **Salary sacrifice (pre-tax super)** — reduce OTE for super purposes, reduce gross for PAYG
- [ ] **Reportable fringe benefits** — include RFBA in STP payload YTD
- [ ] **Negative pay run items** — handle adjustments and corrections
- [ ] **Pay run amendment** — re-open a finalised pay run, void and recreate
- [ ] **Tax table annual update CLI** — script to update `RESIDENT_TAX_BRACKETS` each July from ATO schedule
- [ ] **Termination payments** — genuine redundancy (tax-free limit), ETP type R/O, leave payout at ordinary rate + 17.5% loading
- [ ] **Multi-currency** (future) — for international freight operations

---

## Payroll — ABA / Banking

- [ ] **Partial payments / split bank accounts** — e.g. 80% to savings, 20% to super
- [ ] **ABA file resubmission** — flag already-submitted files, prevent double payment
- [ ] **BECS / NPP** — New Payments Platform integration for real-time payments (future)
- [ ] **Remittance advice** — email remittance PDF to employee after ABA is lodged

---

## Time & Attendance

- [ ] **GPS clock-in/out** — mobile PWA with geolocation, depot geofence validation
- [ ] **Fatigue pre-shift checklist** — driver self-declaration before clock-in
- [ ] **Vehicle assignment at clock-in** — links T&A entry to vehicle for fatigue record
- [ ] **Break enforcement** — alert when break hasn't been recorded after X hours
- [ ] **Offline mode** — service worker caching for clock-in/out in low-connectivity depots
- [ ] **Bulk timesheet import** — CSV import from telematics systems (Teletrac, Navman, etc.)
- [ ] **Exception reporting** — dashboard showing missed clock-outs, excessive hours, unusual patterns
- [ ] **Integration: telematics** — auto-import hours from GPS tracking systems

---

## Rostering

- [ ] **Drag-and-drop roster** — visual shift creation and movement on the grid
- [ ] **Shift templates** — reusable shift definitions (e.g. "Sydney–Melbourne night run")
- [ ] **Copy previous week** — one-click roster duplication
- [ ] **Publish with notifications** — generate notification events when roster is published (notification delivery TBD)
- [ ] **Cost forecast** — estimated weekly payroll cost based on rostered hours
- [ ] **Availability management** — employees can mark unavailable dates
- [ ] **Open shifts** — post an unfilled shift for available employees to pick up
- [ ] **Minimum notice period** — warn when shift is published less than X hours before start
- [ ] **Fortnightly/monthly view** — extend beyond weekly grid

---

## Leave Management

- [ ] **Long service leave payout on termination** — pro-rata calculation, leave loading, correct tax treatment
- [ ] **Parental leave integration** — Government Paid Parental Leave (GPPL) offset tracking
- [ ] **Community service leave** — jury duty, voluntary emergency management
- [ ] **Leave in advance negative balance** — configurable per-company maximum negative balance
- [ ] **Leave calendar view** — show all pending/approved leave on a calendar
- [ ] **Public holiday import** — annual update of public holidays for all 8 states
- [ ] **LSL portability** — tracking for employees who move between employers in some states (VIC portable LSL)

---

## Compliance

- [ ] **Fatigue record auto-import** — from telematics/EWD (electronic work diary) systems
- [ ] **NHVR accreditation portal sync** (future) — read accreditation status from NHVR directly
- [ ] **Automated compliance reports** — scheduled PDF/CSV sent to depot managers
- [ ] **Notification delivery** — email/SMS alerts for expiring licences (currently only generates notification record)
- [ ] **Training records** — induction, dangerous goods, forklift, chain of responsibility
- [ ] **Document storage** — upload licence photos, medicals, contracts to S3/cloud storage (currently local disk)
- [ ] **Chain of Responsibility** — module for recording CoR duties and sign-offs

---

## Employee Management

- [ ] **User invitation** — invite portal users by email with role assignment
- [ ] **Employee self-service** — employees view payslips, request leave, update contact details
- [ ] **Document storage S3** — AWS S3 / CloudFlare R2 for employee documents (current: local `uploads/` directory)
- [ ] **Onboarding workflow** — digital super choice form, TFN declaration, bank account entry
- [ ] **Termination workflow** — final pay calculation, leave payout, STP finalisation trigger
- [ ] **Bulk import** — improved CSV import with validation preview and mapping UI

---

## Reports

- [ ] **PDF report export** — all CSV reports also available as formatted PDF
- [ ] **Scheduled report delivery** — email reports on a schedule (daily/weekly/monthly)
- [ ] **Workers compensation report** — hours and wages by type for WC premium calculation
- [ ] **Award compliance report** — verify all employees are paid at or above award minimum
- [ ] **Superannuation clearing house export** — ATO Small Business Superannuation Clearing House (SBSCH) format
- [ ] **Cost centre / depot reporting** — break all reports down by depot

---

## Notifications & Integrations

- [ ] **Email delivery** — transactional email via SendGrid / SES (currently: notification record generated only)
- [ ] **SMS alerts** — Twilio integration for urgent compliance alerts and roster publication
- [ ] **Xero integration** — post payroll journal entries to Xero general ledger
- [ ] **MYOB integration** — post payroll journals to MYOB AccountRight
- [ ] **QuickBooks integration** — payroll journal sync
- [ ] **Teletrac Navman integration** — auto-import hours, fatigue data
- [ ] **Wialon / FleetComplete** — GPS telematics integrations

---

## Infrastructure & DevOps

- [ ] **AWS deployment** — ECS Fargate (backend), CloudFront + S3 (frontend), RDS PostgreSQL, ElastiCache Redis, Secrets Manager
- [ ] **CI/CD pipeline** — GitHub Actions: lint → test → build → push ECR → deploy ECS
- [ ] **Database backups** — automated RDS snapshots + point-in-time recovery
- [ ] **Multi-tenancy isolation audit** — verify all queries are scoped by `companyId`
- [ ] **Rate limiting** — express-rate-limit on auth endpoints and API
- [ ] **Audit log retention** — purge/archive audit logs older than 7 years (Fair Work requirement)
- [ ] **GDPR / Privacy Act compliance** — right to erasure, data export, consent management
- [ ] **Health checks + observability** — `/health` endpoint, structured logging (Winston/Pino), Datadog / CloudWatch
- [ ] **Load testing** — k6 scripts for payroll run with 500+ employees

---

## Mobile

- [ ] **Progressive Web App (PWA)** — service worker, install prompt, offline clock-in
- [ ] **React Native app** — dedicated iOS/Android app for drivers (clock-in, view roster, leave requests)
- [ ] **Push notifications** — FCM/APNs integration for roster changes, leave approvals

---

_Last updated: 2026-05-16_
