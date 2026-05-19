import * as Sentry from '@sentry/node'
import { config, isProd } from '../config/index.js'

export function initialiseSentry() {
  if (!config.SENTRY_DSN) return

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: isProd ? 0.2 : 1.0,
  })
}

export { Sentry }
