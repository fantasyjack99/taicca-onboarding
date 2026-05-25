const DEPARTMENTS_API = process.env.DEPARTMENTS_API_URL || 'http://metalpig.synology.me:3300'
const DEPARTMENTS_API_KEY = process.env.DEPARTMENTS_API_KEY || ''

interface SupervisorRecord {
  department: string
  team: string        // "" = 處室層級, "文科推動組" = 組別層級
  managerName: string
  managerEmail: string
  managerTitle: string | null
}

// 取得處長 + 組長的 email，用於通知信 CC
export async function getSupervisorEmails(
  department: string,
  division: string,
): Promise<string[]> {
  try {
    const res = await fetch(`${DEPARTMENTS_API}/api/public/supervisors`, {
      headers: { 'x-api-key': DEPARTMENTS_API_KEY },
      cache: 'no-store',
    })
    if (!res.ok) return []

    const supervisors: SupervisorRecord[] = await res.json()
    const emails: string[] = []

    // 處室處長（team = ""）
    const deptHead = supervisors.find(s => s.department === department && s.team === '')
    if (deptHead?.managerEmail) emails.push(deptHead.managerEmail)

    // 組別組長（跳過「（本室）」「（直屬）」等表示直屬處室的值）
    const hasDivision = division && division !== '（本室）' && division !== '（直屬）'
    if (hasDivision) {
      const divHead = supervisors.find(s => s.department === department && s.team === division)
      if (divHead?.managerEmail && !emails.includes(divHead.managerEmail)) {
        emails.push(divHead.managerEmail)
      }
    }

    return emails
  } catch {
    // API 不可用時靜默降級，不影響信件發送
    return []
  }
}
