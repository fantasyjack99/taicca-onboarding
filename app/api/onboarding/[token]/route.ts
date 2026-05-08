import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchEmployeeList } from '@/lib/ragic'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params
  const session = await prisma.onboardingSession.findUnique({ where: { token } })

  if (!session) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (new Date() > session.expiresAt) {
    return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })
  }

  // Fetch Ragic cache once and populate if not yet cached
  if (!session.ragicCache) {
    let ragicUnavailable = false
    try {
      const employees = await fetchEmployeeList()
      await prisma.onboardingSession.update({
        where: { token },
        data: { ragicCache: employees as unknown as import('@prisma/client').Prisma.JsonArray },
      })
    } catch {
      ragicUnavailable = true
    }

    return NextResponse.json({
      name: session.name,
      department: session.department,
      division: session.division,
      title: session.title,
      startDate: session.startDate,
      status: session.status,
      ragicUnavailable,
    })
  }

  return NextResponse.json({
    name: session.name,
    department: session.department,
    division: session.division,
    title: session.title,
    startDate: session.startDate,
    status: session.status,
    ragicUnavailable: false,
  })
}
