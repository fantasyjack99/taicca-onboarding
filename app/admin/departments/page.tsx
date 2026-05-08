'use client'
import { useEffect, useState } from 'react'

interface Dept { id: number; name: string; divisions: string[] }

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [newDept, setNewDept] = useState('')
  const [newDivision, setNewDivision] = useState<{ [id: number]: string }>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/departments/manage')
    const data = await res.json()
    setDepts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addDept() {
    if (!newDept.trim()) return
    setSaving(true)
    await fetch('/api/departments/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDept.trim(), divisions: [] }),
    })
    setNewDept('')
    await load()
    setSaving(false)
  }

  async function addDivision(id: number) {
    const div = (newDivision[id] || '').trim()
    if (!div) return
    setSaving(true)
    const dept = depts.find(d => d.id === id)!
    await fetch('/api/departments/manage', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, divisions: [...dept.divisions, div] }),
    })
    setNewDivision(prev => ({ ...prev, [id]: '' }))
    await load()
    setSaving(false)
  }

  async function removeDivision(id: number, div: string) {
    setSaving(true)
    const dept = depts.find(d => d.id === id)!
    await fetch('/api/departments/manage', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, divisions: dept.divisions.filter(d => d !== div) }),
    })
    await load()
    setSaving(false)
  }

  async function removeDept(id: number) {
    if (!confirm('確定要刪除此處室？')) return
    setSaving(true)
    await fetch(`/api/departments/manage?id=${id}`, { method: 'DELETE' })
    await load()
    setSaving(false)
  }

  const inputStyle = {
    padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: '14px',
    fontFamily: 'inherit', flex: 1,
  } as const

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', marginBottom: '6px' }}>部門設定</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          管理處室與組別，供建立新人報到時選擇使用。
        </p>
      </div>

      {/* 新增處室 */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          新增處室
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            style={inputStyle}
            value={newDept}
            onChange={e => setNewDept(e.target.value)}
            placeholder="例：行政管理處"
            onKeyDown={e => e.key === 'Enter' && addDept()}
          />
          <button
            onClick={addDept}
            disabled={!newDept.trim() || saving}
            style={{
              padding: '8px 20px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              opacity: !newDept.trim() || saving ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >新增</button>
        </div>
      </div>

      {/* 處室列表 */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>載入中...</div>
      ) : depts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px',
          border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--text-muted)', fontSize: '14px',
        }}>
          尚未設定任何處室，請先新增。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {depts.map(dept => (
            <div key={dept.id} style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            }}>
              {/* 處室標題 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
              }}>
                <span style={{ fontWeight: '600', fontSize: '15px' }}>{dept.name}</span>
                <button
                  onClick={() => removeDept(dept.id)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '13px', padding: '2px 8px',
                  }}
                >刪除</button>
              </div>

              {/* 組別 */}
              <div style={{ padding: '16px 20px' }}>
                {dept.divisions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {dept.divisions.map(div => (
                      <span key={div} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'var(--accent-bg)', color: 'var(--accent)',
                        padding: '3px 10px', borderRadius: '12px', fontSize: '13px',
                      }}>
                        {div}
                        <button
                          onClick={() => removeDivision(dept.id, div)}
                          style={{
                            background: 'none', border: 'none', color: 'var(--accent)',
                            cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0,
                          }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    style={{ ...inputStyle, fontSize: '13px' }}
                    value={newDivision[dept.id] || ''}
                    onChange={e => setNewDivision(prev => ({ ...prev, [dept.id]: e.target.value }))}
                    placeholder="新增組別（例：資訊組）"
                    onKeyDown={e => e.key === 'Enter' && addDivision(dept.id)}
                  />
                  <button
                    onClick={() => addDivision(dept.id)}
                    disabled={!(newDivision[dept.id] || '').trim() || saving}
                    style={{
                      padding: '6px 16px', background: '#fff',
                      border: '1px solid var(--accent)', color: 'var(--accent)',
                      borderRadius: 'var(--radius-md)', fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'inherit',
                      opacity: !(newDivision[dept.id] || '').trim() ? 0.4 : 1,
                    }}
                  >＋ 新增</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
