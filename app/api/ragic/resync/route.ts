import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncEmployee, RagicTokenError } from '@/lib/ragic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const record = await prisma.onboardingSession.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!record.employeeId) {
    return NextResponse.json({ error: '尚未建檔，無員工編號可同步' }, { status: 400 })
  }
  if (!record.taiccaEmail) {
    return NextResponse.json({ error: '員工尚未填寫 taicca 信箱' }, { status: 400 })
  }

  try {
    await syncEmployee({
      employeeId: record.employeeId,
      department: record.department,
      division: record.division,
      title: record.title,
      name: record.name,
      email: `${record.taiccaEmail}@taicca.tw`,
      startDate: record.startDate,
    })
  } catch (err) {
    console.error('Ragic resync error:', err)
    const isTokenError = err instanceof RagicTokenError
    return NextResponse.json({
      error: isTokenError
        ? 'Ragic Token 已失效，請至「系統設定」更換 API Token'
        : `Ragic 同步失敗：${err instanceof Error ? err.message : '未知錯誤'}`,
      tokenExpired: isTokenError,
    }, { status: 502 })
  }

  const updated = await prisma.onboardingSession.update({
    where: { id },
    data: { ragicSyncedAt: new Date() },
  })

  return NextResponse.json({ success: true, ragicSyncedAt: updated.ragicSyncedAt })
}
