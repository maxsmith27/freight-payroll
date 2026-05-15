// ─────────────────────────────────────────────────────────────────
// Australian Public Holidays — All states and territories
// FY2025-26 (covers calendar years 2025 and 2026)
//
// Sources:
//   NSW: legislation.nsw.gov.au
//   VIC: business.vic.gov.au
//   QLD: business.qld.gov.au
//   WA: commerce.wa.gov.au
//   SA: safework.sa.gov.au
//   TAS: worksafe.tas.gov.au
//   ACT: worksafe.act.gov.au
//   NT: nt.gov.au
//
// IMPORTANT: Bank holiday dates can shift when they fall on weekends.
// Verify each year against official gazetted dates.
// ─────────────────────────────────────────────────────────────────

import type { AustralianState } from '../types/index.js'

export interface PublicHoliday {
  name: string
  date: string // YYYY-MM-DD
  state: AustralianState | null // null = national (all states)
  year: number
}

export const PUBLIC_HOLIDAYS_2025: PublicHoliday[] = [
  // National
  { name: "New Year's Day", date: '2025-01-01', state: null, year: 2025 },
  { name: 'Australia Day', date: '2025-01-27', state: null, year: 2025 }, // 26 Jan falls Sunday → Monday
  { name: 'Good Friday', date: '2025-04-18', state: null, year: 2025 },
  { name: 'Easter Saturday', date: '2025-04-19', state: null, year: 2025 },
  { name: 'Easter Sunday', date: '2025-04-20', state: null, year: 2025 },
  { name: 'Easter Monday', date: '2025-04-21', state: null, year: 2025 },
  { name: 'Anzac Day', date: '2025-04-25', state: null, year: 2025 },
  { name: 'Christmas Day', date: '2025-12-25', state: null, year: 2025 },
  { name: 'Boxing Day', date: '2025-12-26', state: null, year: 2025 },

  // NSW
  { name: 'Bank Holiday', date: '2025-08-04', state: 'NSW', year: 2025 },
  { name: 'Queen\'s Birthday', date: '2025-06-09', state: 'NSW', year: 2025 },

  // VIC
  { name: "Queen's Birthday", date: '2025-06-09', state: 'VIC', year: 2025 },
  { name: 'Melbourne Cup Day', date: '2025-11-04', state: 'VIC', year: 2025 },
  { name: "AFL Grand Final Friday", date: '2025-09-26', state: 'VIC', year: 2025 },

  // QLD
  { name: "Queen's Birthday", date: '2025-10-06', state: 'QLD', year: 2025 },

  // WA
  { name: "Queen's Birthday", date: '2025-09-22', state: 'WA', year: 2025 },
  { name: 'WA Day', date: '2025-06-02', state: 'WA', year: 2025 },

  // SA
  { name: "Queen's Birthday", date: '2025-06-09', state: 'SA', year: 2025 },
  { name: 'Adelaide Cup', date: '2025-05-12', state: 'SA', year: 2025 },
  { name: 'Proclamation Day', date: '2025-12-26', state: 'SA', year: 2025 },

  // TAS
  { name: "Queen's Birthday", date: '2025-06-09', state: 'TAS', year: 2025 },
  { name: 'Eight Hours Day', date: '2025-03-10', state: 'TAS', year: 2025 },

  // ACT
  { name: "Queen's Birthday", date: '2025-06-09', state: 'ACT', year: 2025 },
  { name: 'Canberra Day', date: '2025-03-10', state: 'ACT', year: 2025 },
  { name: 'Family & Community Day', date: '2025-10-06', state: 'ACT', year: 2025 },
  { name: 'Reconciliation Day', date: '2025-06-02', state: 'ACT', year: 2025 },

  // NT
  { name: "Queen's Birthday", date: '2025-06-09', state: 'NT', year: 2025 },
  { name: 'Picnic Day', date: '2025-08-04', state: 'NT', year: 2025 },
]

export const PUBLIC_HOLIDAYS_2026: PublicHoliday[] = [
  // National
  { name: "New Year's Day", date: '2026-01-01', state: null, year: 2026 },
  { name: 'Australia Day', date: '2026-01-26', state: null, year: 2026 },
  { name: 'Good Friday', date: '2026-04-03', state: null, year: 2026 },
  { name: 'Easter Saturday', date: '2026-04-04', state: null, year: 2026 },
  { name: 'Easter Sunday', date: '2026-04-05', state: null, year: 2026 },
  { name: 'Easter Monday', date: '2026-04-06', state: null, year: 2026 },
  { name: 'Anzac Day', date: '2026-04-25', state: null, year: 2026 }, // Saturday — substitute TBC
  { name: 'Christmas Day', date: '2026-12-25', state: null, year: 2026 },
  { name: 'Boxing Day', date: '2026-12-28', state: null, year: 2026 }, // 26 falls Saturday, 27 Sunday

  // NSW
  { name: 'Bank Holiday', date: '2026-08-03', state: 'NSW', year: 2026 },
  { name: "Queen's Birthday", date: '2026-06-08', state: 'NSW', year: 2026 },

  // VIC
  { name: "Queen's Birthday", date: '2026-06-08', state: 'VIC', year: 2026 },
  { name: 'Melbourne Cup Day', date: '2026-11-03', state: 'VIC', year: 2026 },

  // QLD
  { name: "Queen's Birthday", date: '2026-10-05', state: 'QLD', year: 2026 },

  // WA
  { name: "Queen's Birthday", date: '2026-09-28', state: 'WA', year: 2026 },
  { name: 'WA Day', date: '2026-06-01', state: 'WA', year: 2026 },

  // SA
  { name: "Queen's Birthday", date: '2026-06-08', state: 'SA', year: 2026 },
  { name: 'Adelaide Cup', date: '2026-05-11', state: 'SA', year: 2026 },
  { name: 'Proclamation Day', date: '2026-12-28', state: 'SA', year: 2026 },

  // TAS
  { name: "Queen's Birthday", date: '2026-06-08', state: 'TAS', year: 2026 },
  { name: 'Eight Hours Day', date: '2026-03-09', state: 'TAS', year: 2026 },

  // ACT
  { name: "Queen's Birthday", date: '2026-06-08', state: 'ACT', year: 2026 },
  { name: 'Canberra Day', date: '2026-03-09', state: 'ACT', year: 2026 },
  { name: 'Reconciliation Day', date: '2026-06-01', state: 'ACT', year: 2026 },

  // NT
  { name: "Queen's Birthday", date: '2026-06-08', state: 'NT', year: 2026 },
  { name: 'Picnic Day', date: '2026-08-03', state: 'NT', year: 2026 },
]

export const ALL_PUBLIC_HOLIDAYS = [...PUBLIC_HOLIDAYS_2025, ...PUBLIC_HOLIDAYS_2026]

/**
 * Check if a given date is a public holiday for a given state.
 */
export function isPublicHoliday(date: Date, state: AustralianState): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return ALL_PUBLIC_HOLIDAYS.some(
    h => h.date === dateStr && (h.state === null || h.state === state),
  )
}

/**
 * Get all public holidays for a state in a date range.
 */
export function getPublicHolidaysInRange(
  startDate: Date,
  endDate: Date,
  state: AustralianState,
): PublicHoliday[] {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]
  return ALL_PUBLIC_HOLIDAYS.filter(
    h => h.date >= start && h.date <= end && (h.state === null || h.state === state),
  )
}
