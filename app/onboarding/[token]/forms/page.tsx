import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/date'
import EmployeeFormClient from './EmployeeFormClient'

export default async function EmployeeFormsPage({ params }: { params: { token: string } }) {
  const { token } = params
  const session = await prisma.onboardingSession.findUnique({
    where: { token },
    include: { employeeForm: true },
  })

  if (!session) notFound()

  // 過期
  if (new Date() > session.expiresAt) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fafafa', padding:'32px', textAlign:'center' }}>
        <div style={{ color:'var(--accent)', fontSize:'14px', marginBottom:'24px', letterSpacing:'0.1em' }}>TAICCA</div>
        <h1 style={{ fontSize:'22px', marginBottom:'12px' }}>此連結已過期</h1>
        <p style={{ color:'var(--text-secondary)' }}>如需重新取得填寫連結，請聯絡人資部門。</p>
        <p style={{ color:'var(--text-muted)', fontSize:'13px', marginTop:'24px' }}>陳佩芝 分機 602｜phyllis@taicca.tw</p>
      </div>
    )
  }

  // 已送出則顯示感謝
  const alreadySubmitted = !!session.employeeForm?.submittedAt

  return (
    <EmployeeFormClient
      token={token}
      name={session.name}
      taiccaEmail={session.taiccaEmail || ''}
      englishFirst={session.englishFirst || ''}
      englishLast={session.englishLast || ''}
      department={session.department}
      division={session.division}
      title={session.title}
      startDate={formatDate(new Date(session.startDate))}
      alreadySubmitted={alreadySubmitted}
      savedData={session.employeeForm}
    />
  )
}
