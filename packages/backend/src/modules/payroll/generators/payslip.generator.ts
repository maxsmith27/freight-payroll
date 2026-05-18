// ─────────────────────────────────────────────────────────────────
// Payslip PDF generator using pdfmake
// Produces Fair Work Act-compliant payslips
//
// Fair Work Regulations 2009 reg. 3.46 requires payslips to include:
// - Employer name and ABN
// - Employee name
// - Employment category (FT/PT/Casual)
// - Period of payment
// - Date of payment
// - Gross pay
// - Net pay
// - Each deduction and its reason
// - Superannuation contributions
// ─────────────────────────────────────────────────────────────────

import PdfPrinter from 'pdfmake'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import { formatCurrency, formatDate } from '@freight-payroll/shared'
import type { PayslipData } from '@freight-payroll/shared'

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
}

const BRAND_COLOR = '#1e40af' // blue-800
const BORDER_COLOR = '#e5e7eb' // gray-200

export function generatePayslipPDF(data: PayslipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const printer = new PdfPrinter(fonts)

    const docDef: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Helvetica', fontSize: 9, color: '#111827' },
      content: [
        buildHeader(data),
        buildEmployeeCompanySection(data),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER_COLOR }], margin: [0, 8, 0, 8] },
        buildEarningsSection(data),
        buildAllowancesSection(data),
        buildDeductionsSection(data),
        buildSummarySection(data),
        buildLeaveBalancesSection(data),
        buildFooter(data),
      ],
    }

    const pdfDoc = printer.createPdfKitDocument(docDef)
    const buffers: Buffer[] = []
    pdfDoc.on('data', (chunk: Buffer) => buffers.push(chunk))
    pdfDoc.on('end', () => resolve(Buffer.concat(buffers)))
    pdfDoc.on('error', reject)
    pdfDoc.end()
  })
}

// ─── Section builders ─────────────────────────────────────────────────────

function buildHeader(data: PayslipData): Content {
  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: data.company.name, fontSize: 16, bold: true, color: BRAND_COLOR },
          { text: `ABN: ${data.company.abn}`, fontSize: 8, color: '#6b7280' },
          { text: data.company.address, fontSize: 8, color: '#6b7280' },
        ],
      },
      {
        width: 'auto',
        stack: [
          { text: 'PAYSLIP', fontSize: 20, bold: true, color: BRAND_COLOR, alignment: 'right' },
          {
            text: `Period: ${data.period.startDate} �� ${data.period.endDate}`,
            fontSize: 8,
            alignment: 'right',
            color: '#6b7280',
          },
          {
            text: `Pay Date: ${data.period.payDate}`,
            fontSize: 9,
            bold: true,
            alignment: 'right',
          },
        ],
      },
    ],
    margin: [0, 0, 0, 12],
  }
}

function buildEmployeeCompanySection(data: PayslipData): Content {
  return {
    columns: [
      {
        width: '50%',
        stack: [
          { text: 'EMPLOYEE DETAILS', fontSize: 8, bold: true, color: '#6b7280', margin: [0, 0, 0, 4] },
          { text: data.employee.name, bold: true, fontSize: 11 },
          { text: `Employee #: ${data.employee.employeeNumber}` },
          { text: `Position: ${data.employee.position}` },
          { text: `Pay Frequency: ${data.employee.payFrequency}` },
          ...(data.employee.superFund
            ? [
                { text: `Super Fund: ${data.employee.superFund}`, margin: [0, 4, 0, 0] as [number, number, number, number] },
                ...(data.employee.superMemberNumber
                  ? [{ text: `Member #: ${data.employee.superMemberNumber}` }]
                  : []),
              ]
            : []),
        ],
      },
    ],
    margin: [0, 0, 0, 8],
  }
}

function buildEarningsSection(data: PayslipData): Content {
  if (!data.earnings.length) return { text: '' }

  return {
    stack: [
      { text: 'EARNINGS', fontSize: 8, bold: true, color: '#6b7280', margin: [0, 0, 0, 4] },
      {
        table: {
          widths: ['*', 50, 60, 70],
          body: [
            [
              { text: 'Description', bold: true, fillColor: '#f9fafb' },
              { text: 'Hours', bold: true, alignment: 'right', fillColor: '#f9fafb' },
              { text: 'Rate', bold: true, alignment: 'right', fillColor: '#f9fafb' },
              { text: 'Amount', bold: true, alignment: 'right', fillColor: '#f9fafb' },
            ],
            ...data.earnings.map(e => [
              e.description,
              { text: e.hours ? e.hours.toFixed(2) : '', alignment: 'right' },
              { text: e.rate ? formatCurrency(e.rate) : '', alignment: 'right' },
              { text: formatCurrency(e.amount), alignment: 'right' },
            ]),
          ] as TableCell[][],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 8],
      },
    ],
  }
}

function buildAllowancesSection(data: PayslipData): Content {
  if (!data.allowances.length) return { text: '' }

  return {
    stack: [
      { text: 'ALLOWANCES', fontSize: 8, bold: true, color: '#6b7280', margin: [0, 0, 0, 4] },
      {
        table: {
          widths: ['*', 50, 60, 70],
          body: [
            ...data.allowances.map(a => [
              `${a.description}${!a.isTaxable ? ' (Non-taxable)' : ''}`,
              { text: a.units ? a.units.toFixed(2) : '', alignment: 'right' },
              { text: '', alignment: 'right' },
              { text: formatCurrency(a.amount), alignment: 'right' },
            ]),
          ] as TableCell[][],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 8],
      },
    ],
  }
}

function buildDeductionsSection(data: PayslipData): Content {
  if (!data.deductions.length) return { text: '' }

  return {
    stack: [
      { text: 'DEDUCTIONS', fontSize: 8, bold: true, color: '#6b7280', margin: [0, 0, 0, 4] },
      {
        table: {
          widths: ['*', 70],
          body: data.deductions.map(d => [
            d.description,
            { text: formatCurrency(d.amount), alignment: 'right' },
          ]),
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
        },
        margin: [0, 0, 0, 8],
      },
    ],
  }
}

function buildSummarySection(data: PayslipData): Content {
  const rows = [
    ['Gross Earnings', formatCurrency(data.summary.grossEarnings)],
    ...(data.summary.preTaxDeductions
      ? [['Pre-Tax Deductions', `(${formatCurrency(data.summary.preTaxDeductions)})`]]
      : []),
    ['Taxable Income', formatCurrency(data.summary.taxableIncome)],
    ['PAYG Withholding', `(${formatCurrency(data.summary.paygWithholding)})`],
    ...(data.summary.postTaxDeductions
      ? [['Post-Tax Deductions', `(${formatCurrency(data.summary.postTaxDeductions)})`]]
      : []),
  ]

  return {
    columns: [
      { width: '*', text: '' },
      {
        width: 200,
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: BORDER_COLOR }], margin: [0, 0, 0, 4] },
          {
            table: {
              widths: ['*', 80],
              body: [
                ...rows.map(([label, value]) => [
                  { text: label, fontSize: 9 },
                  { text: value, alignment: 'right', fontSize: 9 },
                ]),
                [
                  { text: 'NET PAY', bold: true, fontSize: 11 },
                  { text: formatCurrency(data.summary.netPay), bold: true, fontSize: 11, alignment: 'right', color: BRAND_COLOR },
                ],
                [
                  { text: 'Superannuation', fontSize: 8, color: '#6b7280' },
                  { text: formatCurrency(data.summary.superGuarantee), fontSize: 8, alignment: 'right', color: '#6b7280' },
                ],
              ] as TableCell[][],
            },
            layout: 'noBorders',
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: BRAND_COLOR }], margin: [0, 4, 0, 0] },
        ],
      },
    ],
    margin: [0, 0, 0, 8],
  }
}

function buildLeaveBalancesSection(data: PayslipData): Content {
  if (!data.leaveBalances.length) return { text: '' }

  return {
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }], margin: [0, 8, 0, 8] },
      { text: 'LEAVE BALANCES', fontSize: 8, bold: true, color: '#6b7280', margin: [0, 0, 0, 4] },
      {
        columns: data.leaveBalances.map(lb => ({
          width: '*',
          stack: [
            { text: formatLeaveType(lb.leaveType as string), fontSize: 8, color: '#6b7280' },
            { text: `${lb.balance.toFixed(2)} ${lb.unit}`, bold: true, fontSize: 10 },
          ],
        })),
      },
    ],
  }
}

function buildFooter(data: PayslipData): Content {
  return {
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }], margin: [0, 16, 0, 4] },
      {
        columns: [
          { text: `YTD Gross: ${formatCurrency(data.ytd.grossEarnings)}`, fontSize: 8, color: '#6b7280' },
          { text: `YTD Tax: ${formatCurrency(data.ytd.tax)}`, fontSize: 8, color: '#6b7280', alignment: 'center' },
          { text: `YTD Super: ${formatCurrency(data.ytd.super)}`, fontSize: 8, color: '#6b7280', alignment: 'right' },
        ],
      },
      {
        text: 'This payslip is a confidential document. Please retain for your records.',
        fontSize: 7,
        color: '#9ca3af',
        margin: [0, 8, 0, 0],
        alignment: 'center',
      },
    ],
  }
}

function formatLeaveType(lt: string): string {
  const map: Record<string, string> = {
    ANNUAL: 'Annual Leave',
    PERSONAL_CARERS: 'Personal/Carer\'s',
    LONG_SERVICE: 'Long Service',
    COMPASSIONATE: 'Compassionate',
  }
  return map[lt] ?? lt
}
