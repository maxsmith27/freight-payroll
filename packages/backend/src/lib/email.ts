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
