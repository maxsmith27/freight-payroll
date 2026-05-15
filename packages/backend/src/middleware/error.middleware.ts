import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'
import { isProd } from '../config/index.js'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message)
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super(400, 'Validation failed', details)
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.')
      if (!details[key]) details[key] = []
      details[key].push(issue.message)
    }
    res.status(400).json({ success: false, error: 'Validation failed', details })
    return
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`AppError: ${err.message}`, { statusCode: err.statusCode, path: req.path })
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  // Unexpected error
  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
  })

  res.status(500).json({
    success: false,
    error: isProd ? 'An unexpected error occurred' : String(err),
  })
}
