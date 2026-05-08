'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

interface SessionDetail {
  id: string
  name: string
  department: string
  division: string
  title: string
  startDate: string
  contactEmail: string
  taiccaEmail: string | null
  englishFirst: string | null
  englishLast: string | null
  englishName: string | null
  showPhone: boolean | null
  phoneNumber: string | null
  photoPath: string | null
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED'
  employeeId: string | null
  ragicSyncedAt: string | null
}

export default function AdminReviewPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [record, setRecord] = useState<SessionDetail | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncTokenExpired, setSyncTokenExpired] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)

  // 重新發送
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRecord(data)
        setResendEmail(data.contactEmail || '')
      })
  }, [id])

  async function handleConfirm() {
    if (!employeeId.trim() || syncing) return
    setSyncing(true)
    setSyncError('')
    setSyncTokenExpired(false)
    try {
      const res = await fetch('/api/ragic/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, employeeId: employeeId.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        if (d.tokenExpired) setSyncTokenExpired(true)
        throw new Error(d.error || '同步失敗')
      }
      setSyncSuccess(true)
      setTimeout(() => router.push('/admin'), 1500)
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : '同步失敗，請手動確認 Ragic')
      setSyncing(false)
    }
  }

  async function handleResend() {
    if (!resendEmail.trim() || resending) return
    setResending(true)
    setResendResult(null)
    try {
      const res = await fetch(`/api/employees/${id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactEmail: resendEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '寄送失敗')
      setResendResult({ ok: true, msg: `已成功寄至 ${data.sentTo}` })
      // 更新顯示的信箱
      if (record) setRecord({ ...record, contactEmail: resendEmail.trim() })
    } catch (err: unknown) {
      setResendResult({ ok: false, msg: err instanceof Error ? err.message : '寄送失敗' })
    } finally {
      setResending(false)
    }
  }

  if (!record) {
    return <div style={{ color: 'var(--text-muted)', padding: '40px' }}>載入中...</div>
  }

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '13px', width: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{value ?? '—'}</span>
    </div>
  )

  const inputStyle = {
    padding: '9px 13px',
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'inherit',
    flex: 1,
  } as const

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '14px' }}
        >
          ← 返回
        </button>
        <h1 style={{ fontSize: '22px', margin: 0 }}>{record.name} 報到資料</h1>
      </div>

      {/* HR info */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
          人資填寫
        </h2>
        <Row label="姓名" value={record.name} />
        <Row label="處室" value={`${record.department} ${record.division}`} />
        <Row label="職稱" value={record.title} />
        <Row label="到職日" value={formatDate(new Date(record.startDate))} />
        <Row label="聯絡信箱" value={record.contactEmail} />
      </section>

      {/* 重新發送通知信 */}
      {record.status !== 'CONFIRMED' && (
        <section style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: '28px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>重新發送報到通知信</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            若新人未收到通知信，可在此更換信箱後重新寄送。
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="email"
              style={inputStyle}
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="收件人信箱"
            />
            <button
              onClick={handleResend}
              disabled={!resendEmail.trim() || resending}
              style={{
                padding: '9px 20px',
                background: resendEmail.trim() && !resending ? 'var(--accent)' : '#e5e5e5',
                color: resendEmail.trim() && !resending ? '#fff' : '#999',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: resendEmail.trim() && !resending ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'all 150ms',
              }}
            >
              {resending ? '寄送中...' : '重新發送'}
            </button>
          </div>

          {resendResult && (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              background: resendResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: resendResult.ok ? 'var(--success)' : 'var(--danger)',
              borderLeft: `3px solid ${resendResult.ok ? 'var(--success)' : 'var(--danger)'}`,
            }}>
              {resendResult.ok ? '✓ ' : '✕ '}{resendResult.msg}
            </div>
          )}
        </section>
      )}

      {/* Employee-filled */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
          新人填寫
        </h2>
        <Row label="taicca 信箱" value={record.taiccaEmail ? `${record.taiccaEmail}@taicca.tw` : null} />
        <Row
          label="英文姓名"
          value={record.englishFirst && record.englishLast
            ? `${record.englishFirst} ${record.englishLast}（名片：${record.englishName || `${record.englishFirst} ${record.englishLast}`}）`
            : record.englishName}
        />
        <Row
          label="名片顯示手機"
          value={record.showPhone === null ? null : record.showPhone ? `是${record.phoneNumber ? `　${record.phoneNumber}` : ''}` : '否'}
        />
        <Row
          label="照片"
          value={record.photoPath ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <img
                src={record.photoPath}
                alt="員工照片"
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }}
              />
              <a
                href={`${record.photoPath}?download=true`}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 14px',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  alignSelf: 'center',
                }}
              >
                ↓ 下載原檔
              </a>
            </div>
          ) : null}
        />
      </section>

      {/* 確認建檔 */}
      {record.status === 'SUBMITTED' && !syncSuccess && (
        <section style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>確認建檔</h2>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            員工編號（英文+數字，例：U001）
          </label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
            placeholder="U001"
            style={{
              ...inputStyle,
              flex: 'none',
              width: '160px',
              fontFamily: 'monospace',
              fontSize: '16px',
              marginBottom: '16px',
            }}
          />
          {syncError && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)',
              borderLeft: '3px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '12px',
              fontSize: '13px',
              color: 'var(--danger)',
            }}>
              ⚠ {syncError}
              {syncTokenExpired && (
                <div style={{ marginTop: '6px' }}>
                  <a href="/admin/settings" style={{ color: 'var(--accent)', fontWeight: '600' }}>
                    → 前往系統設定更換 Token
                  </a>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!employeeId.trim() || syncing}
            style={{
              padding: '11px 32px',
              background: employeeId.trim() && !syncing ? 'var(--accent)' : '#e5e5e5',
              color: employeeId.trim() && !syncing ? '#fff' : '#999',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              cursor: employeeId.trim() && !syncing ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontFamily: 'inherit',
              display: 'block',
            }}
          >
            {syncing ? '同步中...' : '確認建檔並同步至 Ragic'}
          </button>
        </section>
      )}

      {(record.status === 'CONFIRMED' || syncSuccess) && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          fontSize: '15px',
        }}>
          ✓ 已建檔完成，員工編號：{record.employeeId || employeeId}
        </div>
      )}
    </div>
  )
}
