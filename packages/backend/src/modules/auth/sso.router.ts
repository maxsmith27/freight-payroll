import { Router } from 'express'
import { config } from '../../config/index.js'
import { getEnabledProviders, buildAuthUrl, handleCallback } from './sso.service.js'

export const ssoRouter = Router()

// GET /api/v1/auth/sso/providers
ssoRouter.get('/providers', (_req, res) => {
  res.json({ providers: getEnabledProviders() })
})

// GET /api/v1/auth/sso/:provider  — initiate OAuth flow
ssoRouter.get('/:provider', (req, res) => {
  const { provider } = req.params
  try {
    const url = buildAuthUrl(provider as 'google' | 'microsoft')
    res.redirect(url)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SSO not available'
    res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(msg)}`)
  }
})

// GET /api/v1/auth/sso/:provider/callback  — OAuth provider redirects here
ssoRouter.get('/:provider/callback', async (req, res) => {
  const { provider } = req.params
  const { code, state, error } = req.query as Record<string, string>

  if (error) {
    return res.redirect(
      `${config.FRONTEND_URL}/login?error=${encodeURIComponent('SSO sign-in was cancelled or denied')}`,
    )
  }

  if (!code || !state) {
    return res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent('Invalid SSO callback')}`)
  }

  try {
    const { tokens } = await handleCallback(provider as 'google' | 'microsoft', code, state)
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
    return res.redirect(`${config.FRONTEND_URL}/auth/callback?${params}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'SSO sign-in failed'
    return res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(msg)}`)
  }
})
