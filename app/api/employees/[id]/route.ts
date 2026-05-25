import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncEmployee, RagicTokenError } from '@/lib/ragic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await req.json()
  const data: Record<string, unknown> = {}

  // HR 欄位
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
  // 員工填寫欄位
  if (body.taiccaEmail   !== undefined) data.taiccaEmail   = body.taiccaEmail?.trim()   || null
  if (body.englishFirst  !== undefined) data.englishFirst  = body.englishFirst?.trim()  || null
  if (body.englishLast   !== undefined) data.englishLast   = body.englishLast?.trim()   || null
  if (body.englishName   !== undefined) data.englishName   = body.englishName?.trim()   || null
  if (body.showPhone     !== undefined) data.showPhone     = body.showPhone
  if (body.phoneNumber   !== undefined) data.phoneNumber   = body.phoneNumber?.trim()   || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updated = await prisma.onboardingSession.update({ where: { id }, data })

  let ragicSynced = false
  let ragicError: string | null = null
  let ragicTokenExpired = false

  if (updated.ragicSyncedAt && updated.employeeId && updated.taiccaEmail) {
    try {
      await syncEmployee({
        employeeId: updated.employeeId,
        department: updated.department,
        division: updated.division,
        title: updated.title,
        name: updated.name,
        email: `${updated.taiccaEmail}@taicca.tw`,
        startDate: updated.startDate,
      })
      await prisma.onboardingSession.update({
        where: { id },
        data: { ragicSyncedAt: new Date() },
      })
      ragicSynced = true
    } catch (err) {
      ragicTokenExpired = err instanceof RagicTokenError
      ragicError = ragicTokenExpired
        ? 'Ragic Token 已失效，請至系統設定更換'
        : `Ragic 同步失敗：${err instanceof Error ? err.message : '未知錯誤'}`
    }
  }

  return NextResponse.json({ success: true, ragicSynced, ragicError, ragicTokenExpired })
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
