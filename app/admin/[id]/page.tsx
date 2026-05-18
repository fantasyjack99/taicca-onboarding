'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/date'

// ── 模組層級元件（不在函式內定義，避免每次 render 產生新 reference 導致 input 失焦）──

const inputStyle = {
  padding: '9px 13px',
  background: '#fff',
  border: '1px solid #e2d9c8',
  borderRadius: '2px',
  color: '#1a1a1a',
  fontSize: '14px',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
} as React.CSSProperties

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid rgba(200,169,110,0.2)' }}>
      <span style={{ color: '#6b7f99', fontSize: '13px', width: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '14px' }}>{value ?? '—'}</span>
    </div>
  )
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(200,169,110,0.2)', gap: '12px' }}>
      <span style={{ color: '#6b7f99', fontSize: '13px', width: '140px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

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
  employeeForm: { id: string; submittedAt: string | null; idNumber: string | null } | null
}

interface EditForm {
  name: string
  department: string
  division: string
  title: string
  startDate: string   // YYYY-MM-DD
  contactEmail: string
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

  // 編輯模式
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [departments, setDepartments] = useState<{ name: string; divisions: string[] }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Ragic 重新同步
  const [resyncing, setResyncing] = useState(false)
  const [resyncError, setResyncError] = useState('')
  const [resyncSuccess, setResyncSuccess] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRecord(data)
        setResendEmail(data.contactEmail || '')
        setLastSyncedAt(data.ragicSyncedAt || null)
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
      setLastSyncedAt(new Date().toISOString())
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
      if (record) setRecord({ ...record, contactEmail: resendEmail.trim() })
    } catch (err: unknown) {
      setResendResult({ ok: false, msg: err instanceof Error ? err.message : '寄送失敗' })
    } finally {
      setResending(false)
    }
  }

  async function handleStartEdit() {
    if (!record) return
    if (departments.length === 0) {
      const res = await fetch('/api/departments')
      if (res.ok) setDepartments(await res.json())
    }
    setEditForm({
      name: record.name,
      department: record.department,
      division: record.division,
      title: record.title,
      startDate: record.startDate.slice(0, 10),
      contactEmail: record.contactEmail,
    })
    setEditing(true)
    setSaveError('')
  }

  async function handleSave() {
    if (!editForm || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '儲存失敗')
      }
      setRecord((prev) => prev ? { ...prev, ...editForm } : prev)
      setResendEmail(editForm.contactEmail)
      setEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleResync() {
    if (resyncing) return
    setResyncing(true)
    setResyncError('')
    setResyncSuccess(false)
    try {
      const res = await fetch('/api/ragic/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重新同步失敗')
      setResyncSuccess(true)
      setLastSyncedAt(data.ragicSyncedAt)
    } catch (err: unknown) {
      setResyncError(err instanceof Error ? err.message : '重新同步失敗')
    } finally {
      setResyncing(false)
    }
  }

  if (!record) {
    return <div style={{ color: 'var(--text-muted)', padding: '40px' }}>載入中...</div>
  }

  const currentDivisions = departments.find(d => d.name === editForm?.department)?.divisions ?? []

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

      {/* HR 填寫區塊 */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.05em', margin: 0, textTransform: 'uppercase' }}>
            人資填寫
          </h2>
          {!editing && (
            <button
              onClick={handleStartEdit}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                fontSize: '12px', padding: '4px 12px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 150ms',
              }}
            >
              ✏ 編輯
            </button>
          )}
        </div>

        {!editing ? (
          <>
            <Row label="姓名" value={record.name} />
            <Row label="處室" value={`${record.department} ${record.division}`} />
            <Row label="職稱" value={record.title} />
            <Row label="到職日" value={formatDate(new Date(record.startDate))} />
            <Row label="聯絡信箱" value={record.contactEmail} />
          </>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
            {editForm && (
              <>
                <EditRow label="姓名">
                  <input type="text" style={inputStyle} value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </EditRow>
                <EditRow label="處室">
                  <select style={selectStyle} value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value, division: '' })}>
                    {departments.map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </EditRow>
                <EditRow label="組別">
                  <select style={selectStyle} value={editForm.division}
                    onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}>
                    <option value="">-- 請選擇 --</option>
                    {currentDivisions.map((div: string) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </EditRow>
                <EditRow label="職稱">
                  <input type="text" style={inputStyle} value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </EditRow>
                <EditRow label="到職日">
                  <input type="date" style={inputStyle} value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                </EditRow>
                <EditRow label="聯絡信箱">
                  <input type="email" style={inputStyle} value={editForm.contactEmail}
                    onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })} />
                </EditRow>

                {saveError && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', borderLeft: '3px solid var(--danger)' }}>
                    ⚠ {saveError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '9px 24px', background: saving ? '#e5e5e5' : 'var(--accent)',
                      color: saving ? '#999' : '#fff', border: 'none',
                      borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {saving ? '儲存中...' : '儲存'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setSaveError('') }}
                    style={{
                      padding: '9px 20px', background: 'none',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    取消
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>重新發送報到通知信</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            若新人未收到通知信，可在此更換信箱後重新寄送。重發信件主旨將標示「更新」。
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="email"
              style={{ ...inputStyle, flex: 1, width: 'auto' }}
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

      {/* 新人填寫 */}
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
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '6px 14px', background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                  textDecoration: 'none', fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap', alignSelf: 'center',
                }}
              >
                ↓ 下載原檔
              </a>
            </div>
          ) : null}
        />
      </section>

      {/* 員工資料表單狀態 */}
      <section style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: record.employeeForm?.submittedAt ? '14px' : '0' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>員工基本資料表單</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {record.employeeForm?.submittedAt
                ? `✓ 已填寫完成 — ${new Date(record.employeeForm.submittedAt).toLocaleString('zh-TW')}`
                : '尚未填寫'
              }
            </div>
          </div>
          <span style={{
            background: record.employeeForm?.submittedAt ? 'rgba(45,138,78,0.1)' : 'rgba(176,125,0,0.1)',
            color: record.employeeForm?.submittedAt ? 'var(--success)' : 'var(--warning)',
            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
          }}>
            {record.employeeForm?.submittedAt ? '已填寫' : '待填寫'}
          </span>
        </div>
        {record.employeeForm?.submittedAt && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={`/api/admin/employees/${record.id}/download-form?type=basic`}
              download
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: 'var(--accent)', color: '#fff',
                borderRadius: 'var(--radius-md)', textDecoration: 'none',
                fontSize: '13px', fontWeight: '600',
              }}
            >
              ↓ 員工基本資料卡.docx
            </a>
            <a
              href={`/api/admin/employees/${record.id}/download-form?type=withholding`}
              download
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: '#fff',
                border: '1px solid var(--accent)', color: 'var(--accent)',
                borderRadius: 'var(--radius-md)', textDecoration: 'none',
                fontSize: '13px', fontWeight: '600',
              }}
            >
              ↓ 薪資扣繳選擇表.docx
            </a>
          </div>
        )}
      </section>

      {/* 確認建檔 */}
      {record.status === 'SUBMITTED' && !syncSuccess && (
        <section style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '28px',
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
          marginBottom: '28px',
        }}>
          ✓ 已建檔完成，員工編號：{record.employeeId || employeeId}
        </div>
      )}

      {/* Ragic 重新同步（已建檔才顯示） */}
      {lastSyncedAt && (
        <section style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: '28px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Ragic 資料同步</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            上次同步：{new Date(lastSyncedAt).toLocaleString('zh-TW')}
            <br />
            若剛更新了姓名、處室、職稱等欄位，請手動重新同步至 Ragic。
          </p>

          {resyncSuccess && (
            <div style={{
              padding: '8px 12px', background: 'var(--success-bg)', color: 'var(--success)',
              borderRadius: 'var(--radius-sm)', fontSize: '13px', borderLeft: '3px solid var(--success)',
              marginBottom: '12px',
            }}>
              ✓ 已重新同步（{new Date(lastSyncedAt).toLocaleString('zh-TW')}）
            </div>
          )}

          {resyncError && (
            <div style={{
              padding: '8px 12px', background: 'var(--danger-bg)', color: 'var(--danger)',
              borderRadius: 'var(--radius-sm)', fontSize: '13px', borderLeft: '3px solid var(--danger)',
              marginBottom: '12px',
            }}>
              ⚠ {resyncError}
            </div>
          )}

          <button
            onClick={handleResync}
            disabled={resyncing}
            style={{
              padding: '9px 24px',
              background: resyncing ? '#e5e5e5' : 'var(--accent)',
              color: resyncing ? '#999' : '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: '600',
              cursor: resyncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {resyncing ? '同步中...' : '重新同步至 Ragic'}
          </button>
        </section>
      )}
    </div>
  )
}
