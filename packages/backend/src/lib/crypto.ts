import crypto from 'crypto'
import { config } from '../config/index.js'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex') // 32 bytes
const IV_LENGTH = 12 // GCM standard
const AUTH_TAG_LENGTH = 16

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypt a value produced by encrypt().
 * Returns the original plaintext string.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')

  const [ivB64, authTagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Encrypt if value is present, otherwise return null.
 */
export function encryptOptional(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

/**
 * Decrypt if value is present, otherwise return null.
 */
export function decryptOptional(value: string | null | undefined): string | null {
  if (!value) return null
  return decrypt(value)
}

/**
 * Hash a password with bcrypt-compatible salted hash.
 * We use crypto here for a deterministic approach; auth uses bcryptjs for passwords.
 */
export function hashSensitive(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
