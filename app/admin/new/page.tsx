'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Department {
  name: string
  divisions: string[]
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '15px',
  fontFamily: 'inherit',
  marginTop: '6px',
} as const

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--text-secondary)',
  marginBottom: '0',
} as const

export default function NewEmployeePage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptError, setDeptError] = useState(false)
  const [form, setForm] = useState({
    name: '',
    department: '',
    division: '',
    title: '',
    startDate: '',
    contactEmail: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState(false)

  useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDepartments(data)
        else setDeptError(true)
      })
      .catch(() => setDeptError(true))
  }, [])

  const divisions =
    departments.find((d) => d.name === form.department)?.divisions || []

  const isValid =
    form.name.trim().length >= 2 &&
    form.department &&
    form.division &&
    form.title.trim() &&
    form.startDate &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.emailError) setEmailError(true)
      else router.push('/admin')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '送出失敗，請稍後再試')
      setSubmitting(false)
    }
  }

  if (emailError) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center' }}>
        <div style={{ color: 'var(--warning)', fontSize: '32px', marginBottom: '16px' }}>⚠</div>
        <h2>新人記錄已建立</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          但報到通知信寄送失敗，請確認 SMTP 設定後手動重新寄送。
        </p>
        <button
          onClick={() => router.push('/admin')}
          style={{
            marginTop: '24px',
            padding: '10px 24px',
            background: 'var(--accent)',
            color: '#0a1628',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          回到管理列表
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '22px', marginBottom: '32px' }}>新增新人報到</h1>

      {deptError && (
        <div
          style={{
            background: 'var(--warning-bg)',
            borderLeft: '3px solid var(--warning)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px',
            fontSize: '13px',
            color: 'var(--warning)',
          }}
        >
          ⚠ 無法載入部門資料，請重新整理頁面
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={labelStyle}>姓名 *</label>
          <input
            type="text"
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例：鄭國宏"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>處室 *</label>
            <select
              style={inputStyle}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value, division: '' })}
              required
            >
              <option value="">選擇處室</option>
              {departments.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>組別 *</label>
            <select
              style={inputStyle}
              value={form.division}
              onChange={(e) => setForm({ ...form, division: e.target.value })}
              required
              disabled={!form.department}
            >
              <option value="">選擇組別</option>
              {divisions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>職稱 *</label>
          <input
            type="text"
            style={inputStyle}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例：一級專員"
            required
          />
        </div>

        <div>
          <label style={labelStyle}>到職日 *</label>
          <input
            type="date"
            style={inputStyle}
            value={form.startDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>聯絡 E-MAIL *（新人的個人信箱，非 @taicca.tw）</label>
          <input
            type="email"
            style={inputStyle}
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            placeholder="personal@gmail.com"
            required
          />
        </div>

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || submitting}
          style={{
            padding: '14px',
            background: isValid && !submitting ? 'var(--accent)' : 'var(--bg-card)',
            color: isValid && !submitting ? '#0a1628' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '15px',
            fontWeight: '600',
            cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
            transition: 'all 200ms ease-out',
          }}
        >
          {submitting ? '寄送中...' : '寄出報到通知信'}
        </button>
      </form>
    </div>
  )
}
