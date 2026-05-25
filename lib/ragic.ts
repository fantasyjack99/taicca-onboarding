import { prisma } from './db'

// 院內同仁主檔 (/s/4) 數字欄位 ID
const FIELDS = {
  alreadyLeft: '1000052',  // 已離職
  employeeId:  '1000046',  // 員工編號
  email:       '1000245',  // 本院信箱
  name:        '1000048',  // 姓名
  department:  '1000049',  // 所屬部門
  title:       '1000050',  // 職稱
  division:    '1001088',  // 組別
  startDate:   '1001232',  // 到職日
}

// 優先從 DB SystemConfig 讀取，fallback 到 env
export async function getRagicApiKey(): Promise<string> {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'ragic_api_key' } })
  return config?.value || process.env.RAGIC_API_KEY || ''
}

export async function getRagicApiUrl(): Promise<string> {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'ragic_api_url' } })
  return config?.value || process.env.RAGIC_API_URL || 'https://ap16.ragic.com/taiccaiantest/s/4'
}

// Ragic 錯誤類型
export class RagicTokenError extends Error {
  constructor() { super('Ragic Token 已失效，請至系統設定更換') }
}
export class RagicNetworkError extends Error {
  constructor(status: number) { super(`Ragic 連線失敗 (HTTP ${status})`) }
}

export interface RagicEmployee {
  ragicId?: number
  employeeId?: string
  email?: string
  name?: string
  department?: string
  division?: string
  title?: string
}

export async function fetchEmployeeList(): Promise<RagicEmployee[]> {
  const [apiKey, apiUrl] = await Promise.all([getRagicApiKey(), getRagicApiUrl()])

  const res = await fetch(`${apiUrl}?api&v=3`, {
    headers: { Authorization: `Basic ${apiKey}` },
    cache: 'no-store',
  })

  if (res.status === 401 || res.status === 403) throw new RagicTokenError()
  if (!res.ok) throw new RagicNetworkError(res.status)

  const data = await res.json()

  return Object.values(data)
    .filter((row): row is Record<string, unknown> =>
      typeof row === 'object' && row !== null && '_ragicId' in (row as object)
    )
    .map((r) => ({
      ragicId: r['_ragicId'] as number,
      employeeId: r['員工編號'] as string,
      email: r['本院信箱'] as string,
      name: r['姓名'] as string,
      department: r['所屬部門'] as string,
      division: r['組別'] as string,
      title: r['職稱'] as string,
    }))
}

export async function syncEmployee(data: {
  employeeId: string
  department: string
  division: string
  title: string
  name: string
  email: string
  startDate?: Date
}): Promise<void> {
  const [apiKey, apiUrl] = await Promise.all([getRagicApiKey(), getRagicApiUrl()])

  if (!apiKey) throw new RagicTokenError()

  // 先查詢是否有既有記錄（有 → 更新；沒有 → 新建）
  let ragicRowId: number | null = null
  try {
    const employees = await fetchEmployeeList()
    const existing = employees.find(e => e.employeeId === data.employeeId)
    if (existing?.ragicId) ragicRowId = existing.ragicId
  } catch {
    // 無法取得清單時忽略，直接嘗試新建
  }

  const targetUrl = ragicRowId
    ? `${apiUrl}/${ragicRowId}?api`
    : `${apiUrl}?api`

  const formatDate = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`

  const body: Record<string, string> = {
    [FIELDS.alreadyLeft]: 'FALSE',
    [FIELDS.employeeId]:  data.employeeId,
    [FIELDS.email]:       data.email,
    [FIELDS.name]:        data.name,
    [FIELDS.department]:  data.department,
    [FIELDS.title]:       data.title,
    [FIELDS.division]:    data.division,
  }
  if (data.startDate) {
    body[FIELDS.startDate] = formatDate(data.startDate)
  }

  const encoded = new URLSearchParams(body).toString()

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encoded,
  })

  if (res.status === 401 || res.status === 403) throw new RagicTokenError()
  if (!res.ok) throw new RagicNetworkError(res.status)

  const result = await res.json()
  if (result.status !== 'SUCCESS') {
    throw new Error(`Ragic ${ragicRowId ? '更新' : '建檔'}失敗：${result.msg || '未知錯誤'}`)
  }
}
