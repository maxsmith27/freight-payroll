import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    typeof date === 'string' ? new Date(date) : date,
  )
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'short' }).format(
    typeof date === 'string' ? new Date(date) : date,
  )
}

export function formatABN(abn: string): string {
  const d = abn.replace(/\D/g, '')
  if (d.length !== 11) return abn
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function employmentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CASUAL: 'Casual',
    CONTRACTOR: 'Contractor',
  }
  return map[type] ?? type
}

export function payFrequencyLabel(freq: string): string {
  const map: Record<string, string> = {
    WEEKLY: 'Weekly',
    FORTNIGHTLY: 'Fortnightly',
    MONTHLY: 'Monthly',
  }
  return map[freq] ?? freq
}

export function awardLabel(code: string): string {
  const map: Record<string, string> = {
    MA000038: 'MA000038 — Road Transport & Distribution',
    MA000039: 'MA000039 — Road Transport (Long Distance)',
  }
  return map[code] ?? code
}

export function classificationLabel(level: string): string {
  const map: Record<string, string> = {
    GRADE_1: 'Grade 1',
    GRADE_2: 'Grade 2',
    GRADE_3: 'Grade 3',
    GRADE_4: 'Grade 4',
    GRADE_5: 'Grade 5',
  }
  return map[level] ?? level
}
