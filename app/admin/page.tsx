import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate } from '@/lib/date'

const statusLabel: Record<string, string> = {
  PENDING: '待填寫',
  SUBMITTED: '已填寫待審核',
  CONFIRMED: '已建檔',
}

const statusClass: Record<string, string> = {
  PENDING: 'chip chip-pending',
  SUBMITTED: 'chip chip-submitted',
  CONFIRMED: 'chip chip-confirmed',
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const records = await prisma.onboardingSession.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      department: true,
      division: true,
      title: true,
      startDate: true,
      status: true,
      createdAt: true,
    },
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>報到管理</h1>
        <Link
          href="/admin/new"
          style={{
            background: 'var(--accent)',
            color: '#0a1628',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          + 新增新人
        </Link>
      </div>

      {records.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
          <div>尚無報到記錄</div>
          <Link
            href="/admin/new"
            style={{ color: 'var(--accent)', fontSize: '14px', marginTop: '12px', display: 'inline-block' }}
          >
            新增第一位新人 →
          </Link>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                {['姓名', '單位', '到職日', '狀態', '操作'].map((h) => (
                  <th
                    key={h}
                    style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: '500' }}>{r.name}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {r.department} {r.division}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.title}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {formatDate(new Date(r.startDate))}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={statusClass[r.status]}>{statusLabel[r.status]}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link
                      href={`/admin/${r.id}`}
                      style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '13px' }}
                    >
                      查看 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
