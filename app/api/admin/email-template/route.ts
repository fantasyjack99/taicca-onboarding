import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DEFAULT_TEMPLATE, EmailTemplateConfig, renderEmailHtml } from '@/lib/email-template'

const KEY = 'email_template'

async function getTemplate(): Promise<EmailTemplateConfig> {
  const config = await prisma.systemConfig.findUnique({ where: { key: KEY } })
  if (config) {
    try { return { ...DEFAULT_TEMPLATE, ...JSON.parse(config.value) } } catch {}
  }
  return DEFAULT_TEMPLATE
}

// GET — 取得目前模板設定
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getTemplate())
}

// POST — 儲存模板設定
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const template: EmailTemplateConfig = { ...DEFAULT_TEMPLATE, ...body }

  await prisma.systemConfig.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(template) },
    update: { value: JSON.stringify(template) },
  })
  return NextResponse.json({ success: true })
}

// DELETE — 重設為預設模板
export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.systemConfig.deleteMany({ where: { key: KEY } })
  return NextResponse.json({ success: true })
}

// PUT — 即時預覽（不儲存）
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { template } = await req.json()
  const cfg: EmailTemplateConfig = { ...DEFAULT_TEMPLATE, ...template }

  const html = renderEmailHtml(cfg, {
    name: '王小明',
    department: '行政管理處',
    division: '資訊組',
    title: '一級專員',
    startDate: '2026年6月1日',
    deadlineStr: '2026年5月25日',
    onboardingUrl: '#',
    baseUrl: '',
  })
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
