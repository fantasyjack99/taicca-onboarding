import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateToken, tokenExpiryDate } from '@/lib/token'
import { sendOnboardingEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, department, division, title, startDate, contactEmail } = body

  if (!name || !department || !division || !title || !startDate || !contactEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const start = new Date(startDate)
  const token = generateToken()
  const expiresAt = tokenExpiryDate(start)

  const record = await prisma.onboardingSession.create({
    data: {
      token,
      name,
      department,
      division,
      title,
      startDate: start,
      contactEmail,
      expiresAt,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const onboardingUrl = `${baseUrl}/onboarding/${token}`
  const formsUrl = `${baseUrl}/onboarding/${token}/forms`

  try {
    await sendOnboardingEmail({
      name,
      department,
      division,
      title,
      startDate: start,
      contactEmail,
      onboardingUrl,
      formsUrl,
    })
  } catch (err) {
    // Email failure is non-fatal — record is created, HR can resend manually
    console.error('Email send failed:', err)
    return NextResponse.json({ id: record.id, emailError: true }, { status: 201 })
  }

  return NextResponse.json({ id: record.id }, { status: 201 })
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const records = await prisma.onboardingSession.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      department: true,
      division: true,
      title: true,
      startDate: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      confirmedAt: true,
    },
  })

  return NextResponse.json(records)
}
