import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DEPARTMENTS_API = process.env.DEPARTMENTS_API_URL || 'http://metalpig.synology.me:3300'
const DEPARTMENTS_API_KEY = process.env.DEPARTMENTS_API_KEY || ''

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 呼叫 it-asset-management 的公開 API
  try {
    const res = await fetch(`${DEPARTMENTS_API}/api/public/departments`, {
      headers: { 'x-api-key': DEPARTMENTS_API_KEY },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      updateCache(data).catch(console.error)
      return NextResponse.json(data)
    }
  } catch {
    // fall through 到快取
  }

  // Fallback：DB 快取
  const cached = await prisma.departmentCache.findMany({ orderBy: { name: 'asc' } })
  if (cached.length > 0) {
    return NextResponse.json(cached.map((d) => ({ name: d.name, divisions: d.divisions })))
  }

  return NextResponse.json(
    { error: '無法載入部門資料，請確認 it-asset-management 系統正常運行' },
    { status: 503 },
  )
}

async function updateCache(departments: Array<{ name: string; divisions: string[] }>) {
  await prisma.departmentCache.deleteMany()
  if (departments.length > 0) {
    await prisma.departmentCache.createMany({
      data: departments.map((d) => ({ name: d.name, divisions: d.divisions })),
    })
  }
}
