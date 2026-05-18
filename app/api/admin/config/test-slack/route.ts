import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.systemConfig.findUnique({ where: { key: 'slack_webhook_url' } })
  const webhookUrl = config?.value

  if (!webhookUrl) {
    return NextResponse.json({ ok: false, error: 'Webhook URL 尚未設定' })
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '✅ TAICCA 新人報到系統 — Slack 通知測試成功！',
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *TAICCA 新人報到系統 — 測試通知*\nSlack 通知已成功連線，新人填寫完資料後將自動推播至此頻道。',
          },
        }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Slack 回應錯誤 (HTTP ${res.status})` })
    }

    return NextResponse.json({ ok: true, message: '測試訊息已發送成功' })
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      error: `連線失敗：${err instanceof Error ? err.message : '未知錯誤'}`,
    })
  }
}
