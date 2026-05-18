import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendOnboardingEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const { contactEmail } = await req.json()

  const record = await prisma.onboardingSession.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const targetEmail = contactEmail?.trim() || record.contactEmail

  // 更新信箱（如果有更改）
  if (targetEmail !== record.contactEmail) {
    await prisma.onboardingSession.update({
      where: { id },
      data: { contactEmail: targetEmail },
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  const onboardingUrl = `${baseUrl}/onboarding/${record.token}`
  const formsUrl = `${baseUrl}/onboarding/${record.token}/forms`

  try {
    await sendOnboardingEmail({
      name: record.name,
      department: record.department,
      division: record.division,
      title: record.title,
      startDate: record.startDate,
      contactEmail: targetEmail,
      onboardingUrl,
      formsUrl,
      isUpdate: true,
    })
    return NextResponse.json({ success: true, sentTo: targetEmail })
  } catch (err) {
    console.error('Resend failed:', err)
    return NextResponse.json({ error: '寄送失敗，請確認 SMTP 設定' }, { status: 500 })
  }
}
