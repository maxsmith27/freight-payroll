import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from './auth.service.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  organizationName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
})

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body)
    const result = await authService.login(body)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = z
      .object({ refreshToken: z.string() })
      .parse(req.body)
    const result = await authService.refreshTokens(refreshToken)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = z
      .object({ refreshToken: z.string().optional() })
      .parse(req.body)
    await authService.logout(req.user!.id, refreshToken)
    res.json({ success: true, message: 'Logged out' })
  } catch (err) {
    next(err)
  }
}

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = registerSchema.parse(req.body)
    const result = await authService.registerOrganization(body)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: req.user })
}

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = changePasswordSchema.parse(req.body)
    await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword)
    res.json({ success: true, message: 'Password changed' })
  } catch (err) {
    next(err)
  }
}
