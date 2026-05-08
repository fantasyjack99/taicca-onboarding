import { prisma } from '@/lib/db'
import { fetchEmployeeList } from '@/lib/ragic'
import { formatDate } from '@/lib/date'
import { notFound } from 'next/navigation'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const { token } = params
  const session = await prisma.onboardingSession.findUnique({ where: { token } })

  if (!session) notFound()

  // Expired
  if (new Date() > session.expiresAt) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--accent)', fontSize: '14px', letterSpacing: '0.1em', marginBottom: '24px' }}>
          TAICCA
        </div>
        <h1 style={{ fontSize: '22px', marginBottom: '12px', fontFamily: '"Noto Serif TC", serif' }}>
          此連結已過期
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          如需重新取得報到連結，請聯絡人資部門。
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          陳佩芝 分機 602｜phyllis@taicca.tw
        </p>
      </div>
    )
  }

  // Already submitted
  if (session.status === 'SUBMITTED' || session.status === 'CONFIRMED') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'var(--success)', fontSize: '40px', marginBottom: '16px' }}>✓</div>
        <h1 style={{ fontSize: '22px', marginBottom: '12px', fontFamily: '"Noto Serif TC", serif' }}>
          感謝您完成填寫
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          您的資料已送出，人資同仁確認後將進一步與您聯絡。
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          陳佩芝 分機 602｜phyllis@taicca.tw
        </p>
      </div>
    )
  }

  // Fetch Ragic cache
  let ragicUnavailable = false
  if (!session.ragicCache) {
    try {
      const employees = await fetchEmployeeList()
      await prisma.onboardingSession.update({
        where: { token },
        data: { ragicCache: employees as unknown as import('@prisma/client').Prisma.JsonArray },
      })
    } catch {
      ragicUnavailable = true
    }
  }

  return (
    <OnboardingClient
      token={token}
      name={session.name}
      department={session.department}
      division={session.division}
      title={session.title}
      startDate={formatDate(new Date(session.startDate))}
      ragicUnavailable={ragicUnavailable}
    />
  )
}
