// ─────────────────────────────────────────────────────────────────
// Shared utility functions
// ─────────────────────────────────────────────────────────────────

/**
 * Round to 2 decimal places (currency rounding).
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Round to 4 decimal places (rate rounding).
 */
export function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000
}

/**
 * Format a number as AUD currency string.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(value)
}

/**
 * Format an Australian ABN: XX XXX XXX XXX
 */
export function formatABN(abn: string): string {
  const digits = abn.replace(/\D/g, '')
  if (digits.length !== 11) return abn
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
}

/**
 * Format a BSB: XXX-XXX
 */
export function formatBSB(bsb: string): string {
  const digits = bsb.replace(/\D/g, '')
  if (digits.length !== 6) return bsb
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

/**
 * Get the financial year string for a date (e.g., "2025-26")
 */
export function getFinancialYear(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-indexed
  if (month >= 7) {
    return `${year}-${String(year + 1).slice(2)}`
  }
  return `${year - 1}-${String(year).slice(2)}`
}

/**
 * Get the first day of the financial year containing a given date.
 */
export function getFinancialYearStart(date: Date): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  if (month >= 7) {
    return new Date(year, 6, 1) // 1 July
  }
  return new Date(year - 1, 6, 1)
}

/**
 * Add weeks to a date.
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

/**
 * Get years of service from start date to a given date.
 */
export function yearsOfService(startDate: Date, toDate: Date = new Date()): number {
  const ms = toDate.getTime() - startDate.getTime()
  return ms / (1000 * 60 * 60 * 24 * 365.25)
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object at midnight UTC.
 */
export function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * Format a Date to YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get the Monday of the week containing a given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get all dates in a range (inclusive).
 */
export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/**
 * Mask a TFN for display: show last 3 digits only.
 */
export function maskTFN(tfn: string): string {
  if (!tfn || tfn.length < 3) return '***'
  return `***-***-${tfn.slice(-3)}`
}

/**
 * Mask a bank account number for display: show last 3 digits only.
 */
export function maskBankAccount(account: string): string {
  if (!account || account.length < 3) return '***'
  return `${'*'.repeat(account.length - 3)}${account.slice(-3)}`
}
