import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params
  const session = await prisma.onboardingSession.findUnique({ where: { token } })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }
  if (session.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  const body = await req.json()
  const { englishFirst, englishLast, englishName, showPhone, phoneNumber, photoUploaded } = body

  if (!englishFirst?.trim() || !englishLast?.trim() || showPhone === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (showPhone && !phoneNumber?.trim()) {
    return NextResponse.json({ error: '請填寫手機號碼' }, { status: 400 })
  }
  if (!photoUploaded) {
    return NextResponse.json({ error: '請上傳照片' }, { status: 400 })
  }

  const first = englishFirst.trim()
  const last = englishLast.trim()
  const taiccaEmail = `${first.toLowerCase()}.${last.toLowerCase()}`
  const cardName = englishName?.trim() || `${first} ${last}`

  await prisma.onboardingSession.update({
    where: { token },
    data: {
      taiccaEmail,
      englishFirst: first,
      englishLast: last,
      englishName: cardName,
      showPhone: Boolean(showPhone),
      phoneNumber: showPhone ? (phoneNumber?.trim() || null) : null,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
