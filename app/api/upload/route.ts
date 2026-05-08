import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { savePhoto } from '@/lib/upload'

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 401 })

  const session = await prisma.onboardingSession.findUnique({ where: { token } })
  if (!session || new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  if (session.status !== 'PENDING') {
    return NextResponse.json({ error: 'Session already submitted' }, { status: 409 })
  }

  const formData = await req.formData()
  const file = formData.get('photo') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const photoPath = await savePhoto(token, buffer)
    await prisma.onboardingSession.update({
      where: { token },
      data: { photoPath },
    })
    return NextResponse.json({ photoPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPLOAD_ERROR'
    if (message === 'INVALID_TYPE') {
      return NextResponse.json({ error: 'Invalid file type. JPG or PNG only.' }, { status: 400 })
    }
    if (message === 'TOO_LARGE') {
      return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
