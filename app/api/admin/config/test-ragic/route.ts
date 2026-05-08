import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRagicApiKey, getRagicApiUrl } from '@/lib/ragic'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiUrl = await getRagicApiUrl()
  const apiKey = await getRagicApiKey()

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'Ragic API Key 尚未設定' })
  }

  try {
    const res = await fetch(`${apiUrl}?api&v=3&limit=1`, {
      headers: { Authorization: `Basic ${apiKey}` },
      cache: 'no-store',
    })

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: false, error: 'Token 無效或已失效，請更換' })
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Ragic 回應錯誤 HTTP ${res.status}` })
    }

    const data = await res.json()
    const count = Object.values(data).filter(
      (v) => typeof v === 'object' && v !== null && '_ragicId' in (v as object)
    ).length

    return NextResponse.json({ ok: true, message: `連線正常，讀取到 ${count} 筆資料` })
  } catch {
    return NextResponse.json({ ok: false, error: '無法連線至 Ragic，請確認網路' })
  }
}
