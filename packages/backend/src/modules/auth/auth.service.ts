import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../../lib/prisma.js'
import { config } from '../../config/index.js'
import { AppError, UnauthorizedError, NotFoundError } from '../../middleware/error.middleware.js'
import type { AuthTokens, UserSession } from '@freight-payroll/shared'

const BCRYPT_ROUNDS = 12

interface LoginInput {
  email: string
  password: string
}

interface RegisterOrgInput {
  organizationName: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export async function login(input: LoginInput): Promise<{ tokens: AuthTokens; user: UserSession }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      companyAccess: {
        include: { company: { select: { name: true } } },
      },
    },
  })

  if (!user || user.deletedAt) {
    // Constant-time comparison to prevent user enumeration
    await bcrypt.compare(input.password, '$2b$12$placeholder.hash.to.prevent.timing.attack')
    throw new UnauthorizedError('Invalid email or password')
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is inactive. Contact your administrator.')
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordValid) {
    throw new UnauthorizedError('Invalid email or password')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

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
    })),
  }

  const tokens = await generateTokens(session)
  return { tokens, user: session }
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ tokens: AuthTokens; user: UserSession }> {
  // Verify the refresh token
  let payload: { sub: string; jti: string }
  try {
    payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as typeof payload
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token')
  }

  // Check the token exists in DB and hasn't been revoked
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: payload.jti },
    include: {
      user: {
        include: {
          companyAccess: {
            include: { company: { select: { name: true } } },
          },
        },
      },
    },
  })

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token invalid or expired')
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  })

  const user = storedToken.user
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
    })),
  }

  const tokens = await generateTokens(session)
  return { tokens, user: session }
}

export async function logout(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { revokedAt: new Date() },
    })
  }
}

export async function registerOrganization(
  input: RegisterOrgInput,
): Promise<{ tokens: AuthTokens; user: UserSession }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
  if (existing) throw new AppError(409, 'Email address is already registered')

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  const org = await prisma.organization.create({
    data: {
      name: input.organizationName,
      slug: slugify(input.organizationName),
      users: {
        create: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          globalRole: 'SUPER_ADMIN',
        },
      },
    },
    include: { users: true },
  })

  const user = org.users[0]
  const session: UserSession = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    globalRole: user.globalRole,
    organizationId: org.id,
    companyAccess: [],
  }

  const tokens = await generateTokens(session)
  return { tokens, user: session }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new NotFoundError('User')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw new AppError(400, 'Current password is incorrect')

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  })

  // Revoke all refresh tokens (force re-login everywhere)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

// ─── Internal helpers ──────────────────────────────────────────────────────

async function generateTokens(session: UserSession): Promise<AuthTokens> {
  const jti = uuidv4() // unique token ID for rotation tracking

  const accessToken = jwt.sign(
    {
      sub: session.id,
      email: session.email,
      globalRole: session.globalRole,
      organizationId: session.organizationId,
      companyAccess: session.companyAccess,
    },
    config.JWT_ACCESS_SECRET,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN as any },
  )

  const refreshToken = jwt.sign(
    { sub: session.id, jti },
    config.JWT_REFRESH_SECRET,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any },
  )

  // Persist refresh token for rotation validation
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.refreshToken.create({
    data: {
      userId: session.id,
      token: jti,
      expiresAt,
    },
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}
