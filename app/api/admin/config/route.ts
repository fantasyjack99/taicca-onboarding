import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const CONFIG_KEYS = ['ragic_api_key', 'ragic_api_url', 'slack_webhook_url'] as const

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: [...CONFIG_KEYS] } },
  })

  const result: Record<string, string> = {}
  for (const c of configs) {
    if (c.key === 'ragic_api_key') {
      result[c.key] = c.value.length > 8 ? '••••••••' + c.value.slice(-8) : '••••••••'
      result['ragic_api_key_set'] = 'true'
      result['ragic_api_key_updated_at'] = c.updatedAt.toISOString()
    } else if (c.key === 'slack_webhook_url') {
      result['slack_webhook_set'] = c.value ? 'true' : 'false'
      result['slack_updated_at'] = c.updatedAt.toISOString()
    } else {
      result[c.key] = c.value
    }
  }

  if (!result['ragic_api_key_set']) {
    const envKey = process.env.RAGIC_API_KEY
    result['ragic_api_key_set'] = envKey ? 'env' : 'false'
  }
  if (!result['slack_webhook_set']) {
    result['slack_webhook_set'] = 'false'
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ragic_api_key, ragic_api_url, slack_webhook_url } = body

  const updates: Promise<unknown>[] = []

  if (ragic_api_key?.trim()) {
    updates.push(
      prisma.systemConfig.upsert({
        where: { key: 'ragic_api_key' },
        create: { key: 'ragic_api_key', value: ragic_api_key.trim() },
        update: { value: ragic_api_key.trim() },
      })
    )
  }

  if (ragic_api_url?.trim()) {
    updates.push(
      prisma.systemConfig.upsert({
        where: { key: 'ragic_api_url' },
        create: { key: 'ragic_api_url', value: ragic_api_url.trim() },
        update: { value: ragic_api_url.trim() },
      })
    )
  }

  if (slack_webhook_url !== undefined) {
    const val = slack_webhook_url.trim()
    updates.push(prisma.systemConfig.upsert({
      where: { key: 'slack_webhook_url' },
      create: { key: 'slack_webhook_url', value: val },
      update: { value: val },
    }))
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: '無更新內容' }, { status: 400 })
  }

  await Promise.all(updates)
  return NextResponse.json({ success: true })
}
