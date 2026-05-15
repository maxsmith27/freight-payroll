import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware.js'
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  registerHandler,
  meHandler,
  changePasswordHandler,
} from './auth.controller.js'

export const authRouter = Router()

// Public
authRouter.post('/login', loginHandler)
authRouter.post('/refresh', refreshHandler)
authRouter.post('/register', registerHandler)

// Authenticated
authRouter.get('/me', authenticate, meHandler)
authRouter.post('/logout', authenticate, logoutHandler)
authRouter.post('/change-password', authenticate, changePasswordHandler)
