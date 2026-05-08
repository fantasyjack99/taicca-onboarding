import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncEmployee, RagicTokenError } from '@/lib/ragic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, employeeId } = await req.json()
  if (!id || !employeeId) {
    return NextResponse.json({ error: 'Missing id or employeeId' }, { status: 400 })
  }

  const record = await prisma.onboardingSession.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status !== 'SUBMITTED') {
    return NextResponse.json({ error: 'Session not in SUBMITTED state' }, { status: 400 })
  }
  if (!record.taiccaEmail) {
    return NextResponse.json({ error: 'Employee email not set' }, { status: 400 })
  }

  try {
    await syncEmployee({
      employeeId,
      department: record.department,
      division: record.division,
      title: record.title,
      name: record.name,
      email: `${record.taiccaEmail}@taicca.tw`,
      startDate: record.startDate,
    })
  } catch (err) {
    console.error('Ragic sync error:', err)
    const isTokenError = err instanceof RagicTokenError
    return NextResponse.json({
      error: isTokenError
        ? 'Ragic Token 已失效，請至「系統設定」更換 API Token'
        : `Ragic 同步失敗：${err instanceof Error ? err.message : '未知錯誤'}`,
      tokenExpired: isTokenError,
    }, { status: 502 })
  }

  await prisma.onboardingSession.update({
    where: { id },
    data: {
      employeeId,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      ragicSyncedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
