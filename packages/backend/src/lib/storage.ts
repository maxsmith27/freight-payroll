import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config/index.js'

let s3: S3Client | null = null

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: config.AWS_REGION,
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // falls back to IAM role / instance profile in AWS environments
    })
  }
  return s3
}

export interface StorageUploadOptions {
  key: string
  body: Buffer | string
  contentType?: string
}

/**
 * Upload a file to storage (S3 or local filesystem).
 * Returns the storage key — store this in the database, not a full path.
 */
export async function uploadFile(opts: StorageUploadOptions): Promise<string> {
  if (config.STORAGE_DRIVER === 's3') {
    if (!config.AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is required when STORAGE_DRIVER=s3')

    const upload = new Upload({
      client: getS3(),
      params: {
        Bucket: config.AWS_S3_BUCKET,
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType ?? 'application/octet-stream',
      },
    })
    await upload.done()
    return opts.key
  }

  // Local storage
  const filePath = path.join(config.STORAGE_LOCAL_PATH, opts.key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, opts.body)
  return opts.key
}

/**
 * Read a file from storage. Returns a Buffer.
 */
export async function downloadFile(key: string): Promise<Buffer> {
  if (config.STORAGE_DRIVER === 's3') {
    if (!config.AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is required when STORAGE_DRIVER=s3')

    const cmd = new GetObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: key })
    const response = await getS3().send(cmd)
    const stream = response.Body as NodeJS.ReadableStream
    return streamToBuffer(stream)
  }

  const filePath = path.join(config.STORAGE_LOCAL_PATH, key)
  return fs.readFile(filePath)
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(key: string): Promise<void> {
  if (config.STORAGE_DRIVER === 's3') {
    if (!config.AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is required when STORAGE_DRIVER=s3')

    await getS3().send(new DeleteObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: key }))
    return
  }

  const filePath = path.join(config.STORAGE_LOCAL_PATH, key)
  await fs.unlink(filePath).catch(() => {})
}

/**
 * Generate a pre-signed URL (S3) or a local file URL for serving files.
 * For local dev, the caller must set up a static-files route.
 * @param expiresInSeconds - Only applies to S3. Defaults to 1 hour.
 */
export async function getFileUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (config.STORAGE_DRIVER === 's3') {
    if (!config.AWS_S3_BUCKET) throw new Error('AWS_S3_BUCKET is required when STORAGE_DRIVER=s3')

    const cmd = new GetObjectCommand({ Bucket: config.AWS_S3_BUCKET, Key: key })
    return getSignedUrl(getS3(), cmd, { expiresIn: expiresInSeconds })
  }

  // Local: return a relative URL that our static-file middleware can serve
  return `/files/${key}`
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
