import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64), // 32-byte hex = 64 hex chars

  FRONTEND_URL: z.string().default('http://localhost:3000'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-southeast-2'),
  AWS_S3_BUCKET: z.string().optional(),

  // SSO — all optional; a provider is only active when both ID and secret are present
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  EMAIL_DRIVER: z.enum(['console', 'sendgrid', 'ses']).default('console'),
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  SMS_DRIVER: z.enum(['console', 'twilio']).default('console'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  SENTRY_DSN: z.string().optional(),
})

function parseEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  return result.data
}

export const config = parseEnv()

export const isProd = config.NODE_ENV === 'production'
export const isDev = config.NODE_ENV === 'development'
