import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function getValidSession(token: string) {
  const session = await prisma.onboardingSession.findUnique({
    where: { token },
    include: { employeeForm: true },
  })
  if (!session) return null
  if (new Date() > session.expiresAt) return null
  return session
}

// GET — 載入已存資料（含 session 基本資訊）
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getValidSession(params.token)
  if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  return NextResponse.json({
    session: {
      name: session.name,
      taiccaEmail: session.taiccaEmail,
      englishFirst: session.englishFirst,
      englishLast: session.englishLast,
      department: session.department,
      division: session.division,
      title: session.title,
      startDate: session.startDate,
    },
    form: session.employeeForm,
  })
}

// POST — 暫存表單資料（draft，submittedAt 維持 null）
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getValidSession(params.token)
  if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const data = await req.json()

  const form = await prisma.employeeFormData.upsert({
    where: { sessionId: session.id },
    create: { sessionId: session.id, ...sanitize(data) },
    update: sanitize(data),
  })

  return NextResponse.json({ success: true, formId: form.id })
}

// PATCH — 最終送出（設定 submittedAt）
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await getValidSession(params.token)
  if (!session) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const data = await req.json()

  // 最低驗證
  if (!data.idNumber?.trim()) {
    return NextResponse.json({ error: '身分證字號為必填' }, { status: 400 })
  }
  if (!data.consentAgreed) {
    return NextResponse.json({ error: '請勾選個人資料同意書' }, { status: 400 })
  }

  await prisma.employeeFormData.upsert({
    where: { sessionId: session.id },
    create: { sessionId: session.id, ...sanitize(data), submittedAt: new Date() },
    update: { ...sanitize(data), submittedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}

// 清理輸入資料，只允許已知欄位
function sanitize(data: Record<string, unknown>) {
  const allowed = [
    'birthDate','idNumber','birthplace','nationality','bloodType',
    'gender','maritalStatus','childrenCount','homePhone','mobilePhone',
    'personalEmail','permanentAddress','currentAddress','sameAddress',
    'education','workHistory','languageSkills','familyMembers','nhiDependents',
    'emergencyName','emergencyRelation','emergencyPhone',
    'laborPensionSelf','laborPensionRate',
    'withholdingMethod','taxDependents','consentAgreed',
  ]
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  )
}
