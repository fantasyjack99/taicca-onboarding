import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendHRNotification, sendSlackNotification } from '@/lib/notify'

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

  const updated = await prisma.onboardingSession.update({
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

  // 非同步通知 HR（不阻塞回應）
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  const adminReviewUrl = `${baseUrl}/admin/${session.id}`
  const notifyPayload = {
    name: session.name,
    department: session.department,
    division: session.division,
    title: session.title,
    startDate: session.startDate,
    taiccaEmail: updated.taiccaEmail,
    englishName: updated.englishName,
    adminReviewUrl,
  }

  // 平行發送，任一失敗不影響主流程
  Promise.allSettled([
    sendHRNotification(notifyPayload),
    sendSlackNotification(notifyPayload),
  ]).then(results => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Notification ${i === 0 ? 'email' : 'slack'} failed:`, r.reason)
      }
    })
  })

  return NextResponse.json({ success: true })
}
