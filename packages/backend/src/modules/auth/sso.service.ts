import crypto from 'node:crypto'
import prisma from '../../lib/prisma.js'
import { config } from '../../config/index.js'
import { AppError, UnauthorizedError } from '../../middleware/error.middleware.js'
import { generateTokens } from './auth.service.js'
import type { UserSession } from '@freight-payroll/shared'

// ─── Provider definitions ────────────────────────────────────────────────────

type Provider = 'google' | 'microsoft'

interface ProviderConfig {
  clientId: string
  clientSecret: string
  authUrl: string
  tokenUrl: string
  profileUrl: string
  scope: string
}

function getProviderConfig(provider: Provider): ProviderConfig {
  if (provider === 'google') {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      throw new AppError(501, 'Google SSO is not configured')
    }
    return {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: 'openid email profile',
    }
  }

  if (provider === 'microsoft') {
    if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET) {
      throw new AppError(501, 'Microsoft SSO is not configured')
    }
    return {
      clientId: config.MICROSOFT_CLIENT_ID,
      clientSecret: config.MICROSOFT_CLIENT_SECRET,
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      profileUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: 'openid email profile User.Read',
    }
  }

  throw new AppError(400, `Unknown SSO provider: ${provider}`)
}

// ─── State store (CSRF protection) ──────────────────────────────────────────
// In-memory with 10-minute TTL. Replace with Redis in production.

const pendingStates = new Map<string, number>()

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [state, ts] of pendingStates) {
    if (ts < cutoff) pendingStates.delete(state)
  }
}, 60_000)

// ─── Public functions ─────────────────────────────────────────────────────────

export function getEnabledProviders(): Provider[] {
  const providers: Provider[] = []
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) providers.push('google')
  if (config.MICROSOFT_CLIENT_ID && config.MICROSOFT_CLIENT_SECRET) providers.push('microsoft')
  return providers
}

export function buildAuthUrl(provider: Provider): string {
  const pc = getProviderConfig(provider)
  const state = crypto.randomBytes(16).toString('hex')
  pendingStates.set(state, Date.now())

  const params = new URLSearchParams({
    client_id: pc.clientId,
    redirect_uri: getCallbackUrl(provider),
    response_type: 'code',
    scope: pc.scope,
    state,
    ...(provider === 'google' ? { access_type: 'online', prompt: 'select_account' } : {}),
  })

  return `${pc.authUrl}?${params}`
}

export async function handleCallback(
  provider: Provider,
  code: string,
  state: string,
): Promise<{ tokens: import('@freight-payroll/shared').AuthTokens; user: UserSession }> {
  // Validate state
  if (!pendingStates.has(state)) {
    throw new UnauthorizedError('Invalid or expired SSO state. Please try signing in again.')
  }
  pendingStates.delete(state)

  const pc = getProviderConfig(provider)

  // Exchange code for access token
  const tokenRes = await fetch(pc.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: pc.clientId,
      client_secret: pc.clientSecret,
      redirect_uri: getCallbackUrl(provider),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    throw new AppError(502, 'Failed to exchange OAuth code for tokens')
  }

  const tokenData = await tokenRes.json() as { access_token: string; error?: string }
  if (tokenData.error || !tokenData.access_token) {
    throw new AppError(502, 'OAuth token exchange failed')
  }

  // Get user profile
  const profileRes = await fetch(pc.profileUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!profileRes.ok) {
    throw new AppError(502, 'Failed to fetch user profile from OAuth provider')
  }

  const profile = await profileRes.json() as Record<string, unknown>
  const { providerAccountId, email, firstName, lastName } = extractProfile(provider, profile)

  if (!email) {
    throw new AppError(400, 'OAuth provider did not return an email address. Ensure your account has a verified email.')
  }

  // Find user: first by linked OAuth account, then by matching email
  let user = await prisma.user.findFirst({
    where: {
      oauthAccounts: { some: { provider, providerAccountId } },
      deletedAt: null,
      isActive: true,
    },
    include: { companyAccess: { include: { company: { select: { name: true } } } } },
  })

  if (!user) {
    user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
      include: { companyAccess: { include: { company: { select: { name: true } } } } },
    })

    if (!user) {
      throw new AppError(
        403,
        'No account found for this email address. Contact your administrator to create an account first.',
      )
    }

    // Link this OAuth account for future sign-ins
    await prisma.oAuthAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId: user.id, provider, providerAccountId, email },
      update: { email },
    })
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  const session: UserSession = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    globalRole: user.globalRole,
    organizationId: user.organizationId,
    companyAccess: user.companyAccess.map(a => ({
      companyId: a.companyId,
      companyName: a.company.name,
      role: a.role,
      depotId: a.depotId ?? undefined,
      enabledPages: a.enabledPages,
    })),
  }

  const tokens = await generateTokens(session)
  return { tokens, user: session }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCallbackUrl(provider: Provider): string {
  // Backend serves on :3001 in dev; in prod FRONTEND_URL would be the API domain
  const apiBase = process.env.API_URL ?? config.FRONTEND_URL.replace(':3000', ':3001')
  return `${apiBase}/api/v1/auth/sso/${provider}/callback`
}

interface NormalisedProfile {
  providerAccountId: string
  email: string | null
  firstName: string
  lastName: string
}

function extractProfile(provider: Provider, raw: Record<string, unknown>): NormalisedProfile {
  if (provider === 'google') {
    return {
      providerAccountId: String(raw.id),
      email: raw.email as string | null,
      firstName: (raw.given_name as string) ?? '',
      lastName: (raw.family_name as string) ?? '',
    }
  }

  // Microsoft Graph
  return {
    providerAccountId: String(raw.id),
    email: (raw.mail ?? raw.userPrincipalName) as string | null,
    firstName: (raw.givenName as string) ?? '',
    lastName: (raw.surname as string) ?? '',
  }
}
