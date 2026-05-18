import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.name)         data.name = body.name.trim()
  if (body.department)   data.department = body.department.trim()
  if (body.division)     data.division = body.division.trim()
  if (body.title)        data.title = body.title.trim()
  if (body.contactEmail) data.contactEmail = body.contactEmail.trim()
  if (body.startDate) {
    const d = new Date(body.startDate)
    data.startDate = d
    data.expiresAt = new Date(d.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await prisma.onboardingSession.update({ where: { id }, data })
  return NextResponse.json(updated)
}

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
      employeeForm: {
        select: {
          id: true,
          submittedAt: true,
          idNumber: true,
        }
      },
    },
  })

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(record)
}
