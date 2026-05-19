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

interface EditForm2 {
  taiccaEmail: string    // without @taicca.tw
  englishFirst: string
  englishLast: string
  englishName: string
  showPhone: boolean | null
  phoneNumber: string
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
  const [checking, setChecking] = useState(false)
  const [dupConfirm, setDupConfirm] = useState<{
    name: string; department: string; division: string; title: string
  } | null>(null)

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
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // 新人填寫欄位編輯
  const [editing2, setEditing2] = useState(false)
  const [editForm2, setEditForm2] = useState<EditForm2 | null>(null)
  const [saving2, setSaving2] = useState(false)
  const [saveError2, setSaveError2] = useState('')
  const [saveResult2, setSaveResult2] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRecord(data)
        setResendEmail(data.contactEmail || '')
      })
  }, [id])

  async function handleConfirm(force = false) {
    if (!employeeId.trim() || syncing || checking) return

    // 若尚未強制確認，先查 Ragic 是否有重複
    if (!force) {
      setChecking(true)
      setSyncError('')
      try {
        const chk = await fetch(`/api/ragic/check?employeeId=${encodeURIComponent(employeeId.trim())}`)
        const data = await chk.json()
        if (data.exists) {
          setDupConfirm(data.employee)
          setChecking(false)
          return // 等待使用者確認
        }
      } catch {
        // 查詢失敗不阻斷流程，直接繼續
      }
      setChecking(false)
    }

    // 執行同步
    setSyncing(true)
    setSyncError('')
    setSyncTokenExpired(false)
    setDupConfirm(null)
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
    setSaveResult(null)
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '儲存失敗')
      setRecord((prev) => prev ? { ...prev, ...editForm } : prev)
      setResendEmail(editForm.contactEmail)
      setEditing(false)
      if (result.ragicSynced) {
        setSaveResult({ ok: true, msg: '已儲存並同步至 Ragic' })
      } else if (result.ragicError) {
        setSaveResult({ ok: false, msg: `已儲存，但 Ragic 同步失敗：${result.ragicError}` })
      } else {
        setSaveResult({ ok: true, msg: '已儲存' })
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  function handleStartEdit2() {
    if (!record) return
    setEditForm2({
      taiccaEmail: record.taiccaEmail || '',
      englishFirst: record.englishFirst || '',
      englishLast: record.englishLast || '',
      englishName: record.englishName || '',
      showPhone: record.showPhone,
      phoneNumber: record.phoneNumber || '',
    })
    setEditing2(true)
    setSaveError2('')
    setSaveResult2(null)
  }

  async function handleSave2() {
    if (!editForm2 || saving2) return
    setSaving2(true)
    setSaveError2('')
    setSaveResult2(null)
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm2),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '儲存失敗')
      setRecord((prev) => prev ? {
        ...prev,
        taiccaEmail: editForm2.taiccaEmail || null,
        englishFirst: editForm2.englishFirst || null,
        englishLast: editForm2.englishLast || null,
        englishName: editForm2.englishName || null,
        showPhone: editForm2.showPhone,
        phoneNumber: editForm2.phoneNumber || null,
      } : prev)
      setEditing2(false)
      if (result.ragicSynced) {
        setSaveResult2({ ok: true, msg: '已儲存並同步至 Ragic' })
      } else if (result.ragicError) {
        setSaveResult2({ ok: false, msg: `已儲存，但 Ragic 同步失敗：${result.ragicError}` })
      } else {
        setSaveResult2({ ok: true, msg: '已儲存' })
      }
    } catch (err: unknown) {
      setSaveError2(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving2(false)
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

      {/* 儲存結果提示 */}
      {saveResult && (
        <div style={{
          marginBottom: '20px', padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          background: saveResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: saveResult.ok ? 'var(--success)' : 'var(--danger)',
          borderLeft: `3px solid ${saveResult.ok ? 'var(--success)' : 'var(--danger)'}`,
        }}>
          {saveResult.ok ? '✓ ' : '⚠ '}{saveResult.msg}
        </div>
      )}

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.05em', margin: 0, textTransform: 'uppercase' }}>
            新人填寫
          </h2>
          {!editing2 && (
            <button
              onClick={handleStartEdit2}
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

        {!editing2 ? (
          <>
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
          </>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
            {editForm2 && (
              <>
                <EditRow label="taicca 信箱">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="text" style={inputStyle} value={editForm2.taiccaEmail}
                      onChange={(e) => setEditForm2({ ...editForm2, taiccaEmail: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                      placeholder="mars.chen" />
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>@taicca.tw</span>
                  </div>
                </EditRow>
                <EditRow label="英文名">
                  <input type="text" style={inputStyle} value={editForm2.englishFirst}
                    onChange={(e) => setEditForm2({ ...editForm2, englishFirst: e.target.value })}
                    placeholder="Mars" />
                </EditRow>
                <EditRow label="英文姓氏">
                  <input type="text" style={inputStyle} value={editForm2.englishLast}
                    onChange={(e) => setEditForm2({ ...editForm2, englishLast: e.target.value })}
                    placeholder="CHEN" />
                </EditRow>
                <EditRow label="名片英文姓名">
                  <input type="text" style={inputStyle} value={editForm2.englishName}
                    onChange={(e) => setEditForm2({ ...editForm2, englishName: e.target.value })}
                    placeholder="Mars CHEN" />
                </EditRow>
                <EditRow label="名片顯示手機">
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {([true, false] as const).map((val) => (
                      <label key={String(val)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        <input type="radio" name="editShowPhone" checked={editForm2.showPhone === val}
                          onChange={() => setEditForm2({ ...editForm2, showPhone: val, phoneNumber: val ? editForm2.phoneNumber : '' })} />
                        {val ? '是，顯示' : '否，不顯示'}
                      </label>
                    ))}
                  </div>
                </EditRow>
                {editForm2.showPhone === true && (
                  <EditRow label="手機號碼">
                    <input type="tel" style={inputStyle} value={editForm2.phoneNumber}
                      onChange={(e) => setEditForm2({ ...editForm2, phoneNumber: e.target.value })}
                      placeholder="0912-345-678" />
                  </EditRow>
                )}

                {saveError2 && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', borderLeft: '3px solid var(--danger)' }}>
                    ⚠ {saveError2}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button onClick={handleSave2} disabled={saving2} style={{
                    padding: '9px 24px', background: saving2 ? '#e5e5e5' : 'var(--accent)',
                    color: saving2 ? '#999' : '#fff', border: 'none',
                    borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600',
                    cursor: saving2 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}>
                    {saving2 ? '儲存中...' : '儲存'}
                  </button>
                  <button onClick={() => { setEditing2(false); setSaveError2('') }} style={{
                    padding: '9px 20px', background: 'none',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    取消
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {saveResult2 && (
          <div style={{
            marginTop: '10px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '13px',
            background: saveResult2.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: saveResult2.ok ? 'var(--success)' : 'var(--danger)',
            borderLeft: `3px solid ${saveResult2.ok ? 'var(--success)' : 'var(--danger)'}`,
          }}>
            {saveResult2.ok ? '✓ ' : '⚠ '}{saveResult2.msg}
          </div>
        )}

        {/* 照片（唯讀，不可編輯） */}
        <Row
          label="照片"
          value={record.photoPath ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <img src={record.photoPath} alt="員工照片"
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
              <a href={`${record.photoPath}?download=true`} download style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '6px 14px', background: '#fff', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                textDecoration: 'none', fontSize: '13px', cursor: 'pointer',
                whiteSpace: 'nowrap', alignSelf: 'center',
              }}>
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
            請輸入員工編號
          </label>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
            placeholder=""
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
          {/* 重複員工編號警示 */}
          {dupConfirm && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #d97706',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: '14px',
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: '600', color: '#92400e', fontSize: '14px' }}>
                ⚠ 員工編號「{employeeId.trim()}」在 Ragic 中已存在
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#78350f' }}>
                現有記錄：{dupConfirm.name}
                {dupConfirm.department && `｜${dupConfirm.department}`}
                {dupConfirm.division && ` ${dupConfirm.division}`}
                {dupConfirm.title && `｜${dupConfirm.title}`}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#92400e' }}>
                繼續操作將會以新人資料覆蓋該筆記錄，確定要繼續嗎？
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleConfirm(true)}
                  disabled={syncing}
                  style={{
                    padding: '7px 18px', background: '#d97706', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    fontWeight: '600', cursor: syncing ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontFamily: 'inherit',
                  }}
                >
                  {syncing ? '同步中...' : '確認覆蓋並同步'}
                </button>
                <button
                  onClick={() => setDupConfirm(null)}
                  style={{
                    padding: '7px 18px', background: 'transparent',
                    color: '#92400e', border: '1px solid #d97706',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    fontSize: '13px', fontFamily: 'inherit',
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {!dupConfirm && (
            <button
              onClick={() => handleConfirm(false)}
              disabled={!employeeId.trim() || syncing || checking}
              style={{
                padding: '11px 32px',
                background: employeeId.trim() && !syncing && !checking ? 'var(--accent)' : '#e5e5e5',
                color: employeeId.trim() && !syncing && !checking ? '#fff' : '#999',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: employeeId.trim() && !syncing && !checking ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontFamily: 'inherit',
                display: 'block',
              }}
            >
              {checking ? '檢查中...' : syncing ? '同步中...' : '確認建檔並同步至 Ragic'}
            </button>
          )}
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

    </div>
  )
}
