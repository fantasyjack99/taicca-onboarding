import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png']

export async function savePhoto(
  token: string,
  buffer: Buffer,
): Promise<string> {
  // Server-side MIME validation via magic bytes
  const { fileTypeFromBuffer } = await import('file-type')
  const detected = await fileTypeFromBuffer(buffer)

  if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
    throw new Error('INVALID_TYPE')
  }
  if (buffer.length > MAX_SIZE) {
    throw new Error('TOO_LARGE')
  }

  const dir = path.join(UPLOAD_DIR, token)
  await fs.mkdir(dir, { recursive: true })

  const ext = detected.ext
  const filePath = path.join(dir, `photo.${ext}`)
  await fs.writeFile(filePath, buffer)

  // Return relative path stored in DB
  return `/uploads/${token}/photo.${ext}`
}

export async function deletePhoto(token: string): Promise<void> {
  const dir = path.join(UPLOAD_DIR, token)
  await fs.rm(dir, { recursive: true, force: true })
}
