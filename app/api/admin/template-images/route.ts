import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileTypeFromBuffer } from 'file-type'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > 5 * 1024 * 1024)
    return NextResponse.json({ error: '檔案超過 5MB' }, { status: 400 })

  const type = await fileTypeFromBuffer(buffer)
  if (!type || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type.mime))
    return NextResponse.json({ error: '僅支援 JPG / PNG / GIF / WebP' }, { status: 400 })

  const filename = `${randomUUID()}.${type.ext}`
  const dir = path.join(UPLOAD_DIR, 'template-images')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  return NextResponse.json({ url: `/uploads/template-images/${filename}` })
}
