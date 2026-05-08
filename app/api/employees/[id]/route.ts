import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const record = await prisma.onboardingSession.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      department: true,
      division: true,
      title: true,
      startDate: true,
      contactEmail: true,
      taiccaEmail: true,
      englishFirst: true,
      englishLast: true,
      englishName: true,
      showPhone: true,
      phoneNumber: true,
      photoPath: true,
      status: true,
      employeeId: true,
      ragicSyncedAt: true,
    },
  })

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(record)
}
