# CLAUDE.md — Project Memory: FreightPay (Freight Payroll SaaS)

This file is the authoritative memory document for this project. Reference it at the start of every session. It contains the full product vision, build phases, pricing model, competitive landscape, AI agent strategy, and business plan.

---

## 1. What This Product Is

A **payroll, workforce management, and compliance platform built exclusively for the Australian freight and road transport industry**. There is currently no Australian software product that does what this builds — a payroll platform with deep award interpretation for MA000038 and MA000039, km-based pay floor checking, owner-operator settlements, fatigue compliance, and a full freight-specific finance suite.

**The core problem being solved:**
Freight payroll is uniquely complex. Australian freight companies must comply with the Road Transport (Long Distance Operations) Award (MA000039) and the Road Transport and Distribution Award (MA000038), which include km-based pay floors, vehicle-grade-based classification, penalty rates, fatigue rules, and owner-operator settlements. No general-purpose payroll software handles this properly. Small operators (3–50 trucks) are the most at risk — they can't afford enterprise software but face criminal penalties for wage theft since 1 January 2025 (up to $8.25M for companies, up to 10 years imprisonment for individuals).

**Positioning statement:**
> "One price. Every feature. Built for freight."

**Target market:** Australian freight companies with 3–300 employees/subcontractors. Sweet spot is the 5–50 truck operator.

**Business origin:** The founder identified this gap while working in software sales, observing that no software is tailored to specific freight business processes. The plan is to build the product using AI-assisted development (Claude Code) and launch commercially upon receiving permanent residency.

---

## 2. Product Modules (Full Vision)

### Core (Year 1 Build)
- Employee Management & Digital Onboarding
- Award Engine (MA000038 + MA000039)
- Core Payroll Processing + STP Phase 2
- Leave Management (all types, all 8 states)
- Time & Attendance (GPS clock-in, offline PWA)
- Rostering
- Compliance Module (licences, fatigue, CoR)
- Owner-Operator Settlement Engine

### Future Modules (Year 2+)
- Transport Management System (TMS)
- Fleet Maintenance
- Finance / Accounts (AR/AP)
- Telematics integration (Teletrac Navman, EROAD, MTData)

---

## 3. The Award Engine — Heart of the Product

The award engine is the most critical and differentiated part of the build. It must be built in this exact sequence:

1. **Classification Resolver** — confirm grade from vehicle type and duties
2. **Public Holiday Engine** — all 8 states, substitution rules, regional holidays
3. **Hours Classifier** — ordinary, overtime, Saturday, Sunday, night shift, broken shift
4. **Penalty Rate Calculator** — correct multipliers per hour type
5. **Minimum Engagement Handler** — 4-hour minimums applied automatically
6. **Allowance Engine** — all allowances with taxability rules
7. **Junior Rate Handler** — age-based rates with mid-period birthday splitting
8. **Higher Duties Handler** — temporary grade elevation per shift (whole shift, not just elevated hours)
9. **Casual Conversion Monitor** — track eligibility and alert
10. **Award Floor Checker** — km-based pay floor validation
11. **Annualised Salary Reconciliation Engine**
12. **PAYG Withholding Calculator**
13. **Superannuation Calculator**

**Vehicle Classification Grades (MA000038):**
- Grade 1: motorcycles and vehicles up to 4.5t GVM, local deliveries
- Grade 2: vehicles up to 4.5t GVM multi-drop, or rigid 4.5t–8t GVM
- Grade 3: rigid 8t–13.9t GVM (MR licence)
- Grade 4: rigid 14t GVM+ (HR licence)
- Grade 5: articulated prime mover/semi-trailer (HC class)
- Grade 6: B-doubles and road trains up to 36.5m
- Grade 7: low loaders, over-dimensional, specialised heavy haulage
- Grade 8: multi-axle B-doubles and road trains exceeding 36.5m
- Grade 9: large mobile cranes, GCM over 94 tonnes
- Grade 10: multi-axle trailing equipment, carrying capacity exceeding 70 tonnes

**Rate database must be seeded with:**
- All MA000038 classification rates (verified against Fair Work pay guide)
- All MA000039 rates
- All allowance rates and taxability rules
- All penalty rate multipliers
- Public holiday schedules for all 8 states — 3 years forward
- ATO PAYG tax tables for current financial year
- Superannuation rate (currently 12%) with effective dates
- All rates stored with effective dates for historical accuracy

---

## 4. Build Phases

### Phase 1 — Foundation Layer ✅ COMPLETED
- Database architecture and infrastructure
- Authentication and multi-tenancy (role types: Super Admin, Company Admin, Payroll Officer, Depot Manager, Supervisor, Employee)
- Award rate configuration database
- Dev/staging/production environments
- CI/CD pipeline
- Automated backups, monitoring and alerting

**Phase 1 was completed in days, not the originally estimated months. This accelerates the entire timeline significantly due to AI-assisted development pace.**

---

### Phase 2 — Employee Management
- Employee profile and setup wizard
- Award and classification selection wizard (guided questions)
- Pay structure selection (hourly, km, load, percentage, salary, mixed)
- Pay rate entry with hard floor at award minimum — system refuses to save below award
- Encrypted bank account and TFN details
- Superannuation fund details with stapled fund lookup
- Tax file declaration (digital)
- Document storage (licence uploads, medical certs, contracts)
- Date of birth (drives junior rate calculations)
- State of employment (drives public holiday calculations)
- **Employee Self Service Portal:**
  - View personal details, update bank account
  - View payslips, leave balances
  - Submit leave requests
  - View roster
  - View documents
- **Digital Onboarding Workflow:**
  - Email invite → employee self-completes details
  - TFN declaration and super choice completed digitally
  - Employer reviews and approves → employee becomes active

---

### Phase 3 — The Award Engine
*(See Section 3 above for build sequence)*

This is the most complex and most tested component. Validating correctness cannot be compressed — every calculation must be cross-checked against Fair Work Ombudsman pay guides. Take the time this requires regardless of overall pace.

---

### Phase 4 — Core Payroll Processing
- Pay period management
- Pay run creation and timesheet import
- Km and allowance entry
- Pay run preview with full audit trail
- Adjustment capability
- Pay run finalisation and locking
- Payslip generation (PDF)
- ABA file generation (bank payments)
- SuperStream file generation
- STP Phase 2 pay event generation
- YTD tracking
- STP finalisation event (end of year)

---

### Phase 5 — Leave Management
- All leave types including long service leave (all 8 states)
- Accrual engine per pay run
- Leave balance tracking
- Leave request workflow via ESS
- Leave calendar
- Annual leave loading (17.5%)
- Leave in advance
- Termination leave payout calculator
- Unpaid leave handling
- Leave liability report

---

### Phase 6 — Time and Attendance
- Web and mobile clock in/out with GPS
- Offline-first PWA (critical — freight depots often have poor connectivity)
- Manual timesheet entry with approval workflow
- Break recording with award-based automatic deductions
- Timesheet approval workflow
- Direct integration with payroll engine
- Exception reporting
- Overtime alerts
- Cost centre allocation

---

### Phase 7 — Rostering
- Weekly and fortnightly roster views
- Drag and drop shift building
- Shift templates
- Copy previous week
- Vehicle assignment to shifts
- **Conflict detection:** fatigue rules, licence expiry, leave clashes, double bookings
- Labour cost forecasting before publishing
- Roster publishing with employee notifications
- Availability management via ESS
- Integration with T&A and leave modules

---

### Phase 8 — Compliance Module
- Licence and accreditation register with expiry tracking
- Medical certificate tracking
- Dangerous goods and heavy vehicle accreditation tracking
- Automated expiry alerts at 90, 60, and 30 days
- **Hard block on rostering drivers with expired licences/certs**
- Fatigue management — standard hours, BFM (Basic Fatigue Management), and AFM (Advanced Fatigue Management)
- Fatigue breach alerts to scheduler
- Rest period enforcement
- Chain of Responsibility (CoR) audit trail
- Fair Work 7-year record retention
- Compliance dashboard

---

### Phase 9 — Owner-Operator Settlements
- Subcontractor profile with ABN and GST registration details
- Insurance expiry tracking (hard block when expired)
- Rate agreement management (per km, per load, percentage)
- Settlement calculation engine
- Deduction management (fuel, tolls, advances)
- GST handling
- Settlement sheet PDF generation
- Separate ABA payment file for owner-operators
- Annual payment summary (TPAR)
- ABN verification integration (ATO)

---

### Phase 10 — Polish, Testing, and Security
- End-to-end testing of every workflow
- Load testing
- Security penetration testing
- Accessibility compliance (WCAG)
- Browser and device compatibility
- Performance optimisation
- Error handling and graceful degradation
- Data export capability (GDPR-equivalent portability)
- Audit log verification
- User documentation

---

## 5. Revised Timeline (Accelerated)

Original plan was 24 months. Given AI-assisted development pace (Phase 1 completed in days):

**Months 1–2:** Phases 2, 3, 4 — Employee management, award engine, core payroll
**Month 3:** Phases 5 and 6 — Leave and T&A
**Month 4:** Phases 7 and 8 — Rostering and compliance
**Month 5:** Phase 9 — Owner-operator settlements
**Month 6:** Phase 10 — Polish, security, testing
**Months 7–12:** 6 months ahead of original plan — use for beta, deeper testing, AI agents

**Recommended use of extra time (combination):**
- Go deeper on what exists (testing, edge cases, UI polish)
- Start beta programme earlier with real freight companies
- Build the AI agent layer during product year rather than business prep year

---

## 6. Year 2 — Business Preparation and AI Layer

### Months 13–15: Beta Programme
- 3–5 real freight companies, no charge, in exchange for detailed feedback
- Mix of sizes and pay structures (hourly, km-paid, owner-operators)
- Run real payroll, sit with them on pay day, observe friction points
- Validate award calculations against manual verification
- Collect testimonials and case studies
- Build reference customers who will take calls from prospects

### Months 14–18: AI Agent Infrastructure

**Agent 1 — Award Compliance Monitor**
Monitors Fair Work Australia for award variation decisions and wage review outcomes. When change detected: analyses impact, flags rates needing update, drafts configuration changes for review, notifies affected customers, deploys on correct effective date after approval. Replaces a full-time compliance officer role.

**Agent 2 — Customer Success Monitor**
Monitors every customer account for health signals: no login in 14 days, unusual pay run exceptions, headcount drop 20%+ in 30 days, unacknowledged compliance warnings, repeated award floor top-ups. Generates daily digest ranked by priority.

**Agent 3 — Support Triage**
First-line support via email/chat. Classifies by type and urgency. Resolves common questions from knowledge base. Drafts responses for complex questions. Escalates product issues to bug tracker. Delays need for support hire.

**Agent 4 — Onboarding Assistant**
Guides new customers through setup. Validates award selection. Flags classification mismatches. Checks all required employee information before first pay run. Identifies common configuration mistakes proactively.

**Agent 5 — STP and Compliance Checker**
Pre-run check before every pay run: validates STP payload, checks TFNs/ABNs/bank details, flags anomalies vs prior period, verifies super contributions meet payday super deadline, generates sign-off checklist.

**Agent 6 — Accounts Receivable Monitor**
Sends automated payment reminders at configured intervals. Identifies deteriorating payment patterns. Drafts demand letters. Feeds cash flow forecast with expected collection dates.

**Agent 7 — Sales/Demo Agent**
Qualifies inbound leads, answers product questions, books demos, follows up on trial sign-ups.

**Agent 8 — Payroll Processing Agent**
Ingests T&A / rostering data, applies award rules, calculates gross pay, generates payslips and ABA files, flags anomalies for human review before finalisation.

### Months 16–20: Business Infrastructure
**Legal:** Company structure (Pty Ltd), shareholder agreement, correct share classes for future employee options, ToS + privacy policy (technology lawyer, not template), data processing agreements (Privacy Act), professional indemnity insurance, cyber liability insurance.

**Financial:** Stripe Billing for PEPM model, Xero for own accounting, accountant who understands SaaS metrics, 3-year financial model.

**Operational:** Helpdesk software (Intercom or Zendesk), CRM (HubSpot free tier initially), public status page, incident response process.

### Months 20–24: Sales Preparation and Soft Launch
- Prospect list: ATA member directory, LinkedIn freight company owners, state transport association lists, accountants specialising in transport
- Content: 10 freight payroll compliance articles published
- LinkedIn presence established as freight payroll expert
- 3–5 accountant partnerships who will evaluate product
- **Soft launch Month 22:** Beta customers convert to paid at founder rate (~40% off) in exchange for reference status
- Refine based on real usage Months 22–24
- **Official launch Month 24:** Coinciding with permanent residency. Full pricing, active outbound sales, content marketing, AI agents operational.

---

## 7. Pricing Model

**PEPM (Per Employee Per Month) — Full features for every customer at every size**

No feature tiers. No locked modules. Every freight company gets the same award engine, fatigue compliance, owner-operator settlements, and STP Phase 2 regardless of size. The only variable is headcount.

### Sliding Scale Rate
| Employees | PEPM Rate |
|-----------|-----------|
| 1–10 | $25/employee/month |
| 11–25 | $22/employee/month |
| 26–50 | $20/employee/month |
| 51–100 | $18/employee/month |
| 101–250 | $16/employee/month |
| 251–500 | $14/employee/month |
| 500+ | Custom (enterprise) |

### Annual Billing
- Pay annually → 2 months free (≈17% discount)
- Improves cash flow, reduces churn, reduces processing overhead
- Target 25% of customers on annual billing (conservative)

### Free Trial
- 30-day free trial, no credit card required
- Full feature access — real award calculations, real payslip generation, real STP

### One-Time Add-Ons (not core tier upgrades)
- Telematics integration setup: $299 one-time per integration provider
- Data migration: $499–$1,999 depending on complexity
- Additional company entities (same owner, multiple ABNs): $49/month per additional entity
- API access above usage threshold: $99/month

### Revenue Projections
| Customer Count | Estimated MRR | ARR |
|---------------|--------------|-----|
| 200 customers | ~$96,500 | ~$1.16M |
| 500 customers | ~$280,000 | ~$3.36M |
| 1,500 customers | ~$900,000 | ~$10.8M |
| 3,000 customers | ~$2,000,000 | ~$24M |

---

## 8. Competitive Landscape

**No direct competitor exists.** The market gap is real and validated.

### Tier 1 — Most Likely Incumbent (to displace)

**Employment Hero / KeyPay**
- Biggest payroll name in Australia
- Good at breadth of award interpretation
- Fundamentally a horizontal product serving 50+ industries
- No freight-specific features: no km pay floors, no owner-operator settlements, no fatigue compliance
- Higher price at equivalent feature depth

**Xero Payroll**
- Strong accounting integration
- Minimal award automation
- Medium threat — easy to displace on compliance depth

**MYOB**
- Established brand
- Weak payroll for complex award interpretation
- Medium threat — easy to displace

### Tier 2 — Operational Competitors

**Kynection**
- Closest in operational depth (compliance, fatigue, CoR)
- Does NOT own payroll — integrates out
- High threat as modules expand — potential integration target initially

**Deputy**
- Strong rostering and T&A
- Not built for freight
- Low threat

**ClockOn**
- Simple all-in-one
- No freight depth
- Low threat

**RosterElf**
- Award-compliant rostering rates
- Rostering tool only, not a payroll platform
- Low threat

### Tier 3 — Legacy TMS (not competitors, potential integration targets)
McLeod Software, Freight2020, Transvirtual, Allotrac — all strong operationally, all weak or nonexistent on payroll. These are prospects (freight companies using them for operations need your payroll layer).

### Competitive Positioning
> "Freight payroll is complex, the penalties for getting it wrong are severe, and until now proper automation was only available to large carriers. We built something that gives every freight business in Australia — whether you have 3 trucks or 300 — the same level of compliance protection."

---

## 9. Key Technical Decisions and Constraints

**Data integrity rules (never compromise):**
- All monetary values stored as integers (cents) — no floating point arithmetic anywhere
- All rates stored with effective dates — historical calculations always use rate correct at time of period
- Audit logging on every table touching financial data
- Multi-tenancy: each company's data is fully isolated
- 7-year record retention (Fair Work requirement)

**Architecture requirements:**
- Dev, staging, and production environments (already set up in Phase 1)
- CI/CD pipeline (already set up)
- Automated backups (already set up)
- Monitoring and alerting (already set up)
- Integer arithmetic for all payroll calculations
- Offline-first PWA for T&A (remote depot coverage)

**Compliance non-negotiables:**
- STP Phase 2 (ATO Single Touch Payroll)
- SuperStream for super fund payments
- Payday super compliance
- PAYG withholding
- Privacy Act — data processing agreements required
- Professional indemnity + cyber liability insurance before launch

---

## 10. The Business Philosophy

The moral and commercial case align: small freight operators are the most exposed to underpayment risk and Fair Work penalties, yet have historically been priced out of proper compliance software. The flat PEPM model with full features is both the right thing to do and the most commercially competitive positioning in the market.

The AI-assisted development approach (building with Claude Code) is itself the proof of concept — the founder is using the same technology philosophy to build the product that the product is built around.

**Build sequence priority:** Get the award engine right before anything else. Speed of build is good. Correctness of payroll calculations is non-negotiable. These two things are not in tension — they just require different kinds of attention.

---

*Last updated: May 2026. Reference the 'Freight Payroll Ideas & Strategy' and 'AI Automation Agents' project conversations for full context and decision rationale.*
