import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const KEY = 'admin_emails'

async function getAdminEmails(): Promise<string[]> {
  const config = await prisma.systemConfig.findUnique({ where: { key: KEY } })
  if (config) {
    try { return JSON.parse(config.value) } catch { return [] }
  }
  // fallback 到 env
  return (process.env.HR_ALLOWED_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

async function saveAdminEmails(emails: string[]): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(emails) },
    update: { value: JSON.stringify(emails) },
  })
}

// GET — 取得目前管理員清單
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emails = await getAdminEmails()
  const fromDb = !!(await prisma.systemConfig.findUnique({ where: { key: KEY } }))

  return NextResponse.json({ emails, fromDb })
}

// POST — 新增管理員
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  const normalized = email?.trim().toLowerCase()

  if (!normalized || !normalized.endsWith('@taicca.tw')) {
    return NextResponse.json({ error: '請輸入有效的 @taicca.tw 信箱' }, { status: 400 })
  }

  const emails = await getAdminEmails()
  if (emails.includes(normalized)) {
    return NextResponse.json({ error: '此信箱已在管理員清單中' }, { status: 409 })
  }

  emails.push(normalized)
  await saveAdminEmails(emails)
  return NextResponse.json({ success: true, emails })
}

// DELETE — 移除管理員
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  const normalized = email?.trim().toLowerCase()
  const currentUser = session.user?.email?.toLowerCase()

  if (normalized === currentUser) {
    return NextResponse.json({ error: '無法移除自己的帳號' }, { status: 400 })
  }

  const emails = await getAdminEmails()
  const filtered = emails.filter((e) => e !== normalized)

  if (filtered.length === 0) {
    return NextResponse.json({ error: '至少需保留一位管理員' }, { status: 400 })
  }

  await saveAdminEmails(filtered)
  return NextResponse.json({ success: true, emails: filtered })
}
