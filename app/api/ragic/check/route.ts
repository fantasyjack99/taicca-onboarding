import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchEmployeeList, RagicTokenError } from '@/lib/ragic'

// GET /api/ragic/check?employeeId=XXXX
// 回傳 Ragic 上是否已有此員工編號，若有則附上現有員工資訊
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const employeeId = req.nextUrl.searchParams.get('employeeId')?.trim()
  if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 })

  try {
    const employees = await fetchEmployeeList()
    const existing = employees.find(e => e.employeeId === employeeId)

    if (existing) {
      return NextResponse.json({
        exists: true,
        employee: {
          name: existing.name ?? '',
          department: existing.department ?? '',
          division: existing.division ?? '',
          title: existing.title ?? '',
          email: existing.email ?? '',
        },
      })
    }

    return NextResponse.json({ exists: false })
  } catch (err) {
    const isTokenError = err instanceof RagicTokenError
    return NextResponse.json({
      error: isTokenError ? 'Ragic Token 已失效' : '無法查詢 Ragic',
      tokenExpired: isTokenError,
    }, { status: 502 })
  }
}
