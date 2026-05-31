// ─────────────────────────────────────────────────────────────────
// FreightPay Award Calculator
//
// Edit the SCENARIO block below, then run:
//   pnpm calc
//
// No database required — uses the verified FWO rate tables directly.
// ─────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// ▶  EDIT YOUR SCENARIO HERE
// ═══════════════════════════════════════════════════════════════

const SCENARIO = {
  // Award: 'MA000038' (Road Transport & Distribution)
  //      | 'MA000039' (Long Distance Operations)
  award: 'MA000038' as const,

  // Grade: 'GRADE_1' through 'GRADE_10'
  // MA000039 starts at GRADE_3
  grade: 'GRADE_5' as const,

  // Hourly rate — leave as 0 to use the award minimum for this grade
  // Set higher to test above-award employees
  hourlyRate: 0,

  // Employment type: 'FULL_TIME' | 'PART_TIME' | 'CASUAL'
  employmentType: 'FULL_TIME' as const,

  // Monday of the pay week (YYYY-MM-DD)
  weekStarting: '2025-07-07',

  // Shifts for each day. Omit days with no work.
  // day:      'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'|'Sun'
  // start/end: 24-hour 'HH:MM'
  // breakMins: unpaid break in minutes
  shifts: [
    { day: 'Mon', start: '06:00', end: '16:00', breakMins: 30 },
    { day: 'Tue', start: '06:00', end: '16:00', breakMins: 30 },
    { day: 'Wed', start: '06:00', end: '16:00', breakMins: 30 },
    { day: 'Thu', start: '06:00', end: '16:00', breakMins: 30 },
    { day: 'Fri', start: '06:00', end: '16:00', breakMins: 30 },
    { day: 'Sat', start: '07:00', end: '13:00', breakMins: 0  },
  ],

  // Public holidays that fall in this week (YYYY-MM-DD)
  publicHolidays: [] as string[],

  // Date of birth for junior rate (or leave null)
  dateOfBirth: null as string | null,
}

// ═══════════════════════════════════════════════════════════════
// (No need to edit below this line)
// ═══════════════════════════════════════════════════════════════

import {
  MA000038_RATES,
  MA000039_RATES,
  MA000038_PENALTY_RATES,
  MA000039_PENALTY_RATES,
  ORDINARY_HOURS_PER_WEEK,
  ORDINARY_HOURS_PER_DAY,
  MA000039_ORDINARY_HOURS_PER_WEEK,
} from '@freight-payroll/shared'
import type { AwardClassificationLevel } from '@freight-payroll/shared'
import { processMA000038Week } from '../src/modules/payroll/engines/ma000038.engine.js'
import { processMA000039Week } from '../src/modules/payroll/engines/ma000039.engine.js'
import type { AwardRateContext, DayInput, EmployeeEngineInput } from '../src/modules/payroll/engines/types.js'

// ─── Build rate context from shared constants (no DB) ───────────────────────

const isMA39     = SCENARIO.award === 'MA000039'
const rateTable  = isMA39 ? MA000039_RATES : MA000038_RATES
const penalties  = isMA39 ? MA000039_PENALTY_RATES : MA000038_PENALTY_RATES
const rateEntry  = rateTable.find(r => r.classificationLevel === SCENARIO.grade)

if (!rateEntry) {
  console.error(`\n  ✗ Grade ${SCENARIO.grade} not found in ${SCENARIO.award} rate table.`)
  console.error(`    Available grades: ${rateTable.map(r => r.classificationLevel).join(', ')}\n`)
  process.exit(1)
}

const awardMinimum = rateEntry.hourlyRate
const effectiveRate = SCENARIO.hourlyRate > 0
  ? Math.max(SCENARIO.hourlyRate, awardMinimum)
  : awardMinimum

const ctx: AwardRateContext = {
  baseHourlyRate:         effectiveRate,
  awardMinimumHourlyRate: awardMinimum,
  penaltyRates:           { ...penalties },
  publicHolidays:         new Set(SCENARIO.publicHolidays),
  ordinaryHoursPerWeek:   isMA39 ? MA000039_ORDINARY_HOURS_PER_WEEK : ORDINARY_HOURS_PER_WEEK,
  ordinaryHoursPerDay:    isMA39 ? MA000039_ORDINARY_HOURS_PER_WEEK / 5 : ORDINARY_HOURS_PER_DAY,
  allowanceRates:         new Map(),
}

// ─── Build DayInput array ────────────────────────────────────────────────────

const DAY_OFFSET: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
}

const weekStart = new Date(`${SCENARIO.weekStarting}T00:00:00`)
if (weekStart.getDay() !== 1) {
  console.error(`\n  ✗ weekStarting must be a Monday. ${SCENARIO.weekStarting} is a ${weekStart.toLocaleDateString('en-AU', { weekday: 'long' })}.\n`)
  process.exit(1)
}

/** Add days to a date using calendar arithmetic (avoids DST/UTC offset issues). */
function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

/** Format a Date as 'YYYY-MM-DD' using local time (not UTC). */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const days: DayInput[] = SCENARIO.shifts.map(shift => {
  const offset = DAY_OFFSET[shift.day]
  if (offset === undefined) {
    console.error(`\n  ✗ Unknown day: "${shift.day}". Use Mon|Tue|Wed|Thu|Fri|Sat|Sun.\n`)
    process.exit(1)
  }
  const shiftDate  = addDays(weekStart, offset)
  const dateStr    = localDateStr(shiftDate)
  const date       = new Date(`${dateStr}T00:00:00`)
  const startTime  = new Date(`${dateStr}T${shift.start}:00`)
  const [endH]     = shift.end.split(':').map(Number)
  const [startH]   = shift.start.split(':').map(Number)
  const endDateStr = endH < startH ? localDateStr(addDays(shiftDate, 1)) : dateStr
  const endTime    = new Date(`${endDateStr}T${shift.end}:00`)

  return { date, startTime, endTime, breakMinutes: shift.breakMins, state: 'NSW' as const }
})

// ─── Employee input ───────────────────────────────────────────────────────────

const emp: EmployeeEngineInput = {
  awardCode:           SCENARIO.award,
  classificationLevel: SCENARIO.grade as AwardClassificationLevel,
  employmentType:      SCENARIO.employmentType,
  hourlyRate:          effectiveRate,
  periodStart:         weekStart,
  state:               'NSW',
  dateOfBirth:         SCENARIO.dateOfBirth ? new Date(SCENARIO.dateOfBirth) : undefined,
}

// ─── Run the engine ───────────────────────────────────────────────────────────

const result = isMA39
  ? processMA000039Week(days, emp, ctx)
  : processMA000038Week(days, emp, ctx)

// ─── Pretty output ────────────────────────────────────────────────────────────

const W = 62
const hr = '─'.repeat(W)
const dbl = '═'.repeat(W)

function pad(s: string, n: number, right = false): string {
  return right ? s.padStart(n) : s.padEnd(n)
}

function fmt(n: number): string { return `$${n.toFixed(2)}` }
function fmtH(n: number): string { return `${n.toFixed(4).replace(/\.?0+$/, '')}h` }

const gradeDesc = rateEntry.description.split('—')[1]?.trim() ?? rateEntry.description
const casual = SCENARIO.employmentType === 'CASUAL' ? ' · Casual (+25%)' : ''
const aboveAward = effectiveRate > awardMinimum
  ? `  ↑ above award (min ${fmt(awardMinimum)}/hr)` : ''

console.log(`\n${dbl}`)
console.log(`  FreightPay Award Calculator`)
console.log(`  ${SCENARIO.award} — ${SCENARIO.grade} · ${gradeDesc}`)
console.log(`  ${SCENARIO.employmentType.replace('_', '-')}${casual}`)
console.log(`  Base rate: ${fmt(effectiveRate)}/hr${aboveAward}`)
console.log(`  Ordinary hours: ${ctx.ordinaryHoursPerWeek}h/week, ${ctx.ordinaryHoursPerDay.toFixed(2)}h/day`)
console.log(`  Week of: ${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`)
console.log(dbl)

const EARNING_LABELS: Record<string, string> = {
  ORDINARY:          'Ordinary time',
  OVERTIME_1_5X:     'Overtime (1.5×)',
  OVERTIME_2X:       'Overtime (2×)',
  WEEKEND_PENALTY:   'Sat/Sun penalty',
  NIGHT_PENALTY:     'Night shift (+15%)',
  AFTERNOON_PENALTY: 'Afternoon shift (+10%)',
  PUBLIC_HOLIDAY:    'Public holiday (2.5×)',
  AWARD_FLOOR_TOPUP: 'Award floor top-up',
}

// Column widths
const C = { desc: 30, hours: 8, rate: 9, amount: 9 }

console.log(
  `  ${pad('Description', C.desc)}  ${pad('Hours', C.hours, true)}  ${pad('Rate', C.rate, true)}  ${pad('Amount', C.amount, true)}`
)
console.log(`  ${hr}`)

for (const line of result.lines) {
  const label  = EARNING_LABELS[line.earningType] ?? line.earningType
  const ote    = line.isOTE ? '' : ' *'
  const desc   = pad(`${line.description}`, C.desc)
  const hours  = pad(fmtH(line.hours), C.hours, true)
  const rate   = pad(fmt(line.rate), C.rate, true)
  const amount = pad(fmt(line.amount), C.amount, true)
  console.log(`  ${desc}  ${hours}  ${rate}  ${amount}${ote}`)
}

console.log(`  ${hr}`)

const grandTotal = result.lines.reduce((s, l) => s + l.amount, 0)

console.log(`  ${pad('TOTAL GROSS', C.desc + C.hours + 4, false).padEnd(C.desc + C.hours + 4)}  ${pad(fmt(result.totalGross), C.rate + C.amount + 2, true)}`)
console.log(`  ${pad('OTE (super base)', C.desc + C.hours + 4)}  ${pad(fmt(result.totalOTE), C.rate + C.amount + 2, true)}`)
console.log(`  ${pad('Super @ 12%', C.desc + C.hours + 4)}  ${pad(fmt(Math.round(result.totalOTE * 0.12 * 100) / 100), C.rate + C.amount + 2, true)}`)
console.log(dbl)

console.log(`\n  Hours breakdown:`)
console.log(`    Ordinary : ${fmtH(result.totalOrdinaryHours)}`)
console.log(`    Overtime : ${fmtH(result.totalOvertimeHours)}`)
console.log(`    Total    : ${fmtH(result.totalOrdinaryHours + result.totalOvertimeHours)}`)

const otLines = result.lines.filter(l => !l.isOTE)
if (otLines.length > 0) {
  console.log(`\n  * Not OTE (pure overtime — excluded from super base)`)
}

console.log()
