import { config } from '../config/index.js'
import { logger } from './logger.js'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email via the configured driver.
 *
 * Drivers:
 *   console  — logs to stdout (dev / test)
 *   sendgrid — uses SendGrid API (production)
 *   ses      — Amazon SES (production, future)
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const from = config.EMAIL_FROM ?? 'noreply@freightpayroll.com.au'

  switch (config.EMAIL_DRIVER) {
    case 'sendgrid':
      await sendViaSendGrid(from, msg)
      break
    case 'ses':
      // SES support can be wired later; fall through to console for now
      logger.warn('SES email driver not yet implemented — falling back to console')
      logToConsole(from, msg)
      break
    case 'console':
    default:
      logToConsole(from, msg)
      break
  }
}

function logToConsole(from: string, msg: EmailMessage): void {
  logger.info(`\n${'─'.repeat(60)}\nEMAIL (console driver)\nFrom:    ${from}\nTo:      ${msg.to}\nSubject: ${msg.subject}\n${'─'.repeat(60)}\n${msg.text ?? msg.html}\n${'─'.repeat(60)}`)
}

async function sendViaSendGrid(from: string, msg: EmailMessage): Promise<void> {
  if (!config.SENDGRID_API_KEY) {
    logger.warn('SENDGRID_API_KEY not set — falling back to console driver')
    logToConsole(from, msg)
    return
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: from },
      subject: msg.subject,
      content: [
        ...(msg.text ? [{ type: 'text/plain', value: msg.text }] : []),
        { type: 'text/html', value: msg.html },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`SendGrid error ${response.status}: ${body}`)
  }
}

// ─── Email templates ─────────────────────────────────────────────────────────

export interface ComplianceAlertItem {
  employeeName: string
  employeeNumber: string
  documentType: string
  expiryDate: Date | null
  daysUntilExpiry: number | null
}

export function complianceAlertEmail(opts: {
  companyName: string
  expired: ComplianceAlertItem[]
  critical: ComplianceAlertItem[]  // ≤ 30 days
  warning: ComplianceAlertItem[]   // ≤ 60 days
  notice: ComplianceAlertItem[]    // ≤ 90 days
}): EmailMessage {
  const { companyName, expired, critical, warning, notice } = opts
  const total = expired.length + critical.length + warning.length + notice.length
  const urgentCount = expired.length + critical.length

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const rowHtml = (items: ComplianceAlertItem[], colour: string, label: string) =>
    items.map(item => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 8px 12px; font-weight: 500;">${item.employeeName}</td>
        <td style="padding: 8px 12px; color: #666;">${item.employeeNumber}</td>
        <td style="padding: 8px 12px;">${item.documentType}</td>
        <td style="padding: 8px 12px; text-align: center;">
          <span style="background: ${colour}20; color: ${colour}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${label}</span>
        </td>
        <td style="padding: 8px 12px; text-align: right; color: #555;">${fmtDate(item.expiryDate)}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${colour};">
          ${item.daysUntilExpiry != null && item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)}d overdue` : item.daysUntilExpiry != null ? `${item.daysUntilExpiry}d` : '—'}
        </td>
      </tr>`).join('')

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px;">
      <thead>
        <tr style="background: #f8f9fa; text-align: left;">
          <th style="padding: 8px 12px; color: #666; font-weight: 600;">Employee</th>
          <th style="padding: 8px 12px; color: #666; font-weight: 600;">Number</th>
          <th style="padding: 8px 12px; color: #666; font-weight: 600;">Document</th>
          <th style="padding: 8px 12px; color: #666; font-weight: 600; text-align: center;">Status</th>
          <th style="padding: 8px 12px; color: #666; font-weight: 600; text-align: right;">Expiry date</th>
          <th style="padding: 8px 12px; color: #666; font-weight: 600; text-align: right;">Remaining</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml(expired, '#dc2626', 'EXPIRED')}
        ${rowHtml(critical, '#ea580c', 'CRITICAL')}
        ${rowHtml(warning, '#ca8a04', 'WARNING')}
        ${rowHtml(notice, '#2563eb', 'NOTICE')}
      </tbody>
    </table>`

  const plainRows = [...expired, ...critical, ...warning, ...notice].map(item =>
    `  ${item.employeeName} (${item.employeeNumber}) — ${item.documentType} — expires ${fmtDate(item.expiryDate)}`
  ).join('\n')

  return {
    to: '',
    subject: urgentCount > 0
      ? `⚠️ ${urgentCount} urgent compliance alert${urgentCount > 1 ? 's' : ''} — ${companyName}`
      : `Compliance digest — ${total} item${total > 1 ? 's' : ''} expiring soon — ${companyName}`,
    text: `FreightPayroll Compliance Alert — ${companyName}\n\n${total} document${total > 1 ? 's' : ''} require attention:\n\n${plainRows}\n\nLog in to FreightPayroll to take action.`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; max-width: 700px; margin: 40px auto; padding: 0 20px;">
  <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 18px; font-weight: 700; color: #2563eb; margin: 0;">FreightPayroll</h1>
  </div>
  ${urgentCount > 0 ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
    <strong style="color: #dc2626;">⚠️ ${urgentCount} urgent item${urgentCount > 1 ? 's' : ''} require immediate action</strong>
  </div>` : ''}
  <h2 style="font-size: 20px; margin-bottom: 4px;">Compliance expiry alert</h2>
  <p style="color: #555; margin-bottom: 0;">${companyName} — ${total} document${total > 1 ? 's' : ''} expiring within 90 days</p>
  ${tableHtml}
  <div style="margin-top: 24px;">
    <a href="${process.env['FRONTEND_URL'] ?? 'https://app.freightpayroll.com.au'}/compliance"
       style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600;">
      View compliance dashboard
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #aaa; font-size: 12px;">FreightPayroll — this alert is sent daily. Update or renew documents in the Compliance module.</p>
</body>
</html>`,
  }
}

export function onboardingInviteEmail(opts: {
  companyName: string
  inviterName: string
  inviteUrl: string
  expiresInDays: number
}): EmailMessage {
  const { companyName, inviterName, inviteUrl, expiresInDays } = opts
  return {
    to: '',  // caller sets to
    subject: `You've been invited to join ${companyName} on FreightPayroll`,
    text: `Hi,

${inviterName} from ${companyName} has invited you to complete your employee onboarding on FreightPayroll.

Click the link below to get started:
${inviteUrl}

This link will expire in ${expiresInDays} days.

If you have any questions, contact ${companyName} directly.

FreightPayroll`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; max-width: 560px; margin: 40px auto; padding: 0 20px;">
  <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 18px; font-weight: 700; color: #2563eb; margin: 0;">FreightPayroll</h1>
  </div>
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">You're invited to ${companyName}</h2>
  <p style="color: #555; line-height: 1.6;">
    <strong>${inviterName}</strong> from <strong>${companyName}</strong> has invited you to complete your employee setup on FreightPayroll.
  </p>
  <p style="color: #555; line-height: 1.6;">
    Click the button below to get started. You'll complete your personal details, tax file declaration, and super choice all in one place.
  </p>
  <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; margin: 8px 0 24px;">
    Complete My Onboarding
  </a>
  <p style="color: #888; font-size: 13px;">This link expires in ${expiresInDays} days. If you didn't expect this email, you can safely ignore it.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #aaa; font-size: 12px;">FreightPayroll — Payroll for the transport industry</p>
</body>
</html>`,
  }
}
