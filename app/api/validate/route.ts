import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!rateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json()
  const { token, taiccaEmail, englishName } = body

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 401 })

  const session = await prisma.onboardingSession.findUnique({ where: { token } })
  if (!session || new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Use cached Ragic employee list for local uniqueness check
  const cache = session.ragicCache as Array<{ email?: string; englishName?: string }> | null

  if (!cache) {
    // Cache not populated yet (Ragic may be unavailable)
    return NextResponse.json({
      emailTaken: false,
      nameTaken: false,
      cached: false,
      warning: 'validation_unavailable',
    })
  }

  const emailTaken = taiccaEmail
    ? cache.some((e) => e.email?.toLowerCase() === `${taiccaEmail.toLowerCase()}@taicca.tw`)
    : false

  const nameTaken = englishName
    ? cache.some((e) => e.englishName?.toLowerCase() === englishName.toLowerCase())
    : false

  return NextResponse.json({ emailTaken, nameTaken, cached: true })
}
