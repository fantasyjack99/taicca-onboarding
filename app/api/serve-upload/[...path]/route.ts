import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { auth } from '@/lib/auth'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  // 下載模式需要 HR 身份驗證
  const isDownload = req.nextUrl.searchParams.get('download') === 'true'
  if (isDownload) {
    const session = await auth()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })
  }

  const { path: segments } = params
  const filePath = path.join(UPLOAD_DIR, ...segments)

  // Prevent path traversal
  const resolved = path.resolve(filePath)
  const uploadResolved = path.resolve(UPLOAD_DIR)
  if (!resolved.startsWith(uploadResolved)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const buffer = await fs.readFile(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
    const filename = path.basename(resolved)

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=86400',
      'Content-Length': String(buffer.length),
    }

    if (isDownload) {
      // 強制下載原始檔案，不壓縮
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(filename)}"`
    }

    return new NextResponse(buffer, { headers })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
