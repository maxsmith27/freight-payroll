// ─────────────────────────────────────────────────────────────────
// ABA (Australian Banking Association) file generator
// Produces a .aba file for bulk salary payments via Australian banks
//
// Format: APCA Standard 005.3 (Australian Direct Entry)
// Field widths are fixed — DO NOT change padding logic.
// ─────────────────────────────────────────────────────────────────

export interface ABACompanyDetails {
  bsb: string // 6 digits (no dash)
  accountNumber: string // up to 9 digits
  bankAbbreviation: string // 3-char bank abbreviation e.g. "CBA", "ANZ", "WBC"
  userId: string // 6-char APCA user ID assigned by your bank
  companyName: string // max 26 chars — name on the header
  description: string // max 12 chars — description of the payment batch (e.g. "PAYROLL")
  processDate: Date
}

export interface ABAPayment {
  employeeName: string // max 32 chars
  bsb: string // 6 digits (no dash)
  accountNumber: string // up to 9 digits
  amount: number // in AUD (will be converted to cents)
  reference: string // max 18 chars (appears on employee's bank statement)
  withholdingTax?: number // in AUD — for non-resident payments, otherwise 0
}

export function generateABAFile(
  company: ABACompanyDetails,
  payments: ABAPayment[],
): string {
  const lines: string[] = []

  // Sequence number: 01 for first file of the day
  const sequenceNumber = '01'
  const processDateStr = formatDate(company.processDate)

  // ─── Descriptive Record (Type 0) ──────────────────────────────────────
  // Total 120 characters
  const descriptiveRecord = [
    '0',                                          // pos 1: Record type
    formatBSB(company.bsb),                       // pos 2-8: BSB (NNN-NNN)
    ' ',                                          // pos 9: blank
    padLeft(company.accountNumber, 9, ' '),       // pos 10-17: account (right-justified)
    ' ',                                          // pos 18: indicator (space = standard)
    sequenceNumber,                               // pos 19-20: sequence
    padRight(company.bankAbbreviation, 3),        // pos 21-23: bank abbrev
    '   ',                                        // pos 24-26: blanks
    padRight(company.companyName, 26),            // pos 27-52: user name (26 chars)
    padLeft(company.userId, 6, ' '),              // pos 53-58: user APCA ID (6 chars)
    padRight(company.description, 12),            // pos 59-70: description
    processDateStr,                               // pos 71-76: DDMMYY
    ' '.repeat(40),                               // pos 77-120: blanks (padding)
  ].join('')

  lines.push(descriptiveRecord)

  // ─── Detail Records (Type 1) ───────────────────────────────────────────
  let totalCredits = 0
  let totalDebits = 0
  let recordCount = 0

  for (const payment of payments) {
    const amountCents = Math.round(payment.amount * 100)
    const withholdingCents = Math.round((payment.withholdingTax ?? 0) * 100)

    const detailRecord = [
      '1',                                                      // pos 1: Record type
      formatBSB(payment.bsb),                                   // pos 2-8: BSB
      ' ',                                                      // pos 9: blank
      padLeft(payment.accountNumber, 9, ' '),                   // pos 10-17: account
      ' ',                                                      // pos 18: indicator
      '53',                                                     // pos 19-20: transaction code (53 = pay)
      padLeft(String(amountCents), 10, '0'),                    // pos 21-30: amount (cents, zero-padded)
      padRight(payment.employeeName.slice(0, 32), 32),         // pos 31-62: account name
      padRight(payment.reference.slice(0, 18), 18),            // pos 63-80: lodgement ref
      formatBSB(company.bsb),                                   // pos 81-87: trace BSB
      ' ',                                                      // pos 88: blank
      padLeft(company.accountNumber, 9, ' '),                   // pos 89-96: trace account
      padRight(company.companyName.slice(0, 16), 16),          // pos 97-112: remitter name
      padLeft(String(withholdingCents), 8, '0'),                // pos 113-120: withholding
    ].join('')

    lines.push(detailRecord)
    totalCredits += amountCents
    recordCount++
  }

  // ─── File Total Record (Type 7) ────────────────────────────────────────
  // Net total is credits - debits (for payroll, debits = 0)
  const netTotal = totalCredits - totalDebits
  const netTotalSigned = padLeft(String(netTotal), 10, '0')

  const fileTotalRecord = [
    '7',                                          // pos 1: Record type
    '999-999',                                    // pos 2-8: BSB (always 999-999)
    ' ',                                          // pos 9: blank
    ' '.repeat(8),                                // pos 10-17: blanks
    ' ',                                          // pos 18: blank
    '  ',                                         // pos 19-20: blanks
    netTotalSigned,                               // pos 21-30: net total (credits - debits)
    padLeft(String(totalCredits), 10, '0'),       // pos 31-40: total credits
    padLeft(String(totalDebits), 10, '0'),        // pos 41-50: total debits
    ' '.repeat(24),                               // pos 51-74: blanks
    padLeft(String(recordCount), 6, '0'),         // pos 75-80: record count
    ' '.repeat(40),                               // pos 81-120: blanks
  ].join('')

  lines.push(fileTotalRecord)

  return lines.join('\r\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatBSB(bsb: string): string {
  const digits = bsb.replace(/\D/g, '').slice(0, 6).padStart(6, '0')
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear()).slice(-2)
  return `${d}${m}${y}`
}

function padLeft(str: string, length: number, char = ' '): string {
  return str.slice(0, length).padStart(length, char)
}

function padRight(str: string, length: number, char = ' '): string {
  return str.slice(0, length).padEnd(length, char)
}
