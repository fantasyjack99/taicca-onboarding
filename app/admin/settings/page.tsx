'use client'
import { useEffect, useState } from 'react'

interface ConfigState {
  ragic_api_key_set?: string
  ragic_api_key_updated_at?: string
  ragic_api_key?: string
  ragic_api_url?: string
}

type TestResult = { ok: boolean; message?: string; error?: string } | null

// ─── 共用樣式 ─────────────────────────────────────────
const cardStyle = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  marginBottom: '24px',
} as const

const cardHeaderStyle = {
  padding: '16px 20px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
} as const

const cardBodyStyle = { padding: '20px' } as const

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

// ─── 管理員信箱管理 ────────────────────────────────────
function AdminEmailsSection({ currentUserEmail }: { currentUserEmail: string }) {
  const [emails, setEmails] = useState<string[]>([])
  const [fromDb, setFromDb] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [removeError, setRemoveError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/admins')
    const data = await res.json()
    setEmails(data.emails || [])
    setFromDb(data.fromDb)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const email = newEmail.trim().toLowerCase()
    if (!email || adding) return
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmails(data.emails)
      setNewEmail('')
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(email: string) {
    setRemoveError('')
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmails(data.emails)
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : '移除失敗')
    }
  }

  return (
    <section style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div style={{ fontWeight: '600', fontSize: '15px' }}>管理員帳號</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          只有清單中的 @taicca.tw 帳號可以登入管理後台
        </div>
      </div>

      <div style={cardBodyStyle}>
        {/* 目前管理員清單 */}
        <div style={{ marginBottom: '20px' }}>
          {!fromDb && emails.length > 0 && (
            <div style={{
              marginBottom: '12px', padding: '8px 12px',
              background: 'rgba(176,125,0,0.08)', borderLeft: '3px solid var(--warning)',
              borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--warning)',
            }}>
              ℹ 目前使用環境變數設定，新增或移除後改由資料庫管理
            </div>
          )}

          {emails.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
              清單為空，所有 @taicca.tw 帳號皆可登入（請至少新增一位管理員）
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {emails.map((email) => (
                <div key={email} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: email === currentUserEmail ? 'rgba(200,54,43,0.04)' : 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${email === currentUserEmail ? 'rgba(200,54,43,0.15)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{email}</span>
                    {email === currentUserEmail && (
                      <span style={{
                        fontSize: '11px', padding: '1px 8px',
                        background: 'rgba(200,54,43,0.1)', color: 'var(--accent)',
                        borderRadius: '10px', fontWeight: '600',
                      }}>我</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(email)}
                    disabled={email === currentUserEmail}
                    title={email === currentUserEmail ? '無法移除自己的帳號' : '移除'}
                    style={{
                      background: 'none', border: 'none',
                      color: email === currentUserEmail ? '#ccc' : 'var(--text-muted)',
                      cursor: email === currentUserEmail ? 'not-allowed' : 'pointer',
                      fontSize: '18px', lineHeight: 1, padding: '0 4px',
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {removeError && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--danger)' }}>
              ⚠ {removeError}
            </div>
          )}
        </div>

        {/* 新增管理員 */}
        <div>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            新增管理員
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              style={inputStyle}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="example@taicca.tw"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newEmail.trim() || adding}
              style={{
                padding: '9px 20px',
                background: newEmail.trim() && !adding ? 'var(--accent)' : '#e5e5e5',
                color: newEmail.trim() && !adding ? '#fff' : '#999',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontSize: '14px', fontWeight: '600',
                cursor: newEmail.trim() && !adding ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {adding ? '新增中...' : '新增'}
            </button>
          </div>
          {addError && (
            <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--danger)' }}>
              ⚠ {addError}
            </div>
          )}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            僅限 @taicca.tw 網域。新增後該帳號即可登入管理後台。
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── 主頁面 ───────────────────────────────────────────
export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigState>({})
  const [currentUser, setCurrentUser] = useState('')
  const [newToken, setNewToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult>(null)

  useEffect(() => {
    fetch('/api/admin/config').then((r) => r.json()).then(setConfig)
    fetch('/api/auth/session').then((r) => r.json()).then((s) => {
      setCurrentUser(s?.user?.email?.toLowerCase() || '')
    })
  }, [])

  async function handleSave() {
    if (!newToken.trim() || saving) return
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ragic_api_key: newToken.trim() }),
      })
      if (!res.ok) throw new Error('儲存失敗')
      setSaveResult({ ok: true, msg: 'Token 已更新' })
      setNewToken('')
      setTestResult(null)
      fetch('/api/admin/config').then((r) => r.json()).then(setConfig)
    } catch (err: unknown) {
      setSaveResult({ ok: false, msg: err instanceof Error ? err.message : '儲存失敗' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/config/test-ragic', { method: 'POST' })
      setTestResult(await res.json())
    } catch {
      setTestResult({ ok: false, error: '測試失敗' })
    } finally {
      setTesting(false)
    }
  }

  const isSet = config.ragic_api_key_set === 'true' || config.ragic_api_key_set === 'env'
  const updatedAt = config.ragic_api_key_updated_at
    ? new Date(config.ragic_api_key_updated_at).toLocaleString('zh-TW')
    : null

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', marginBottom: '6px' }}>系統設定</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          管理員帳號與 Ragic API Token 設定。儲存後無需重新部署。
        </p>
      </div>

      {/* 管理員帳號 */}
      <AdminEmailsSection currentUserEmail={currentUser} />

      {/* Ragic Token */}
      <section style={cardStyle}>
        <div style={{
          ...cardHeaderStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>Ragic API Token</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              用於同步員工資料至 Ragic 院內同仁主檔
            </div>
          </div>
          <span style={{
            background: testResult?.ok === false
              ? 'rgba(200,54,43,0.1)' : isSet ? 'rgba(45,138,78,0.1)' : 'rgba(176,125,0,0.1)',
            color: testResult?.ok === false ? 'var(--danger)' : isSet ? 'var(--success)' : 'var(--warning)',
            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
          }}>
            {testResult?.ok === false ? '⚠ Token 失效' : isSet ? '● 已設定' : '○ 未設定'}
          </span>
        </div>

        <div style={cardBodyStyle}>
          {isSet && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>目前 Token</div>
                <code style={{
                  display: 'block', fontSize: '13px', fontFamily: 'monospace',
                  background: 'var(--bg-secondary)', padding: '8px 12px',
                  borderRadius: '4px', wordBreak: 'break-all',
                }}>
                  {config.ragic_api_key}
                </code>
                {updatedAt && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    最後更新：{updatedAt}
                  </div>
                )}
                {config.ragic_api_key_set === 'env' && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ℹ 目前使用環境變數設定，儲存新 token 後改由資料庫管理
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    padding: '8px 16px', background: '#fff',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    fontSize: '13px', cursor: testing ? 'wait' : 'pointer',
                    fontFamily: 'inherit', color: 'var(--text-secondary)',
                  }}
                >
                  {testing ? '測試中...' : '測試目前 Token 連線'}
                </button>

                {testResult && (
                  <div style={{
                    marginTop: '10px', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    background: testResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: testResult.ok ? 'var(--success)' : 'var(--danger)',
                    borderLeft: `3px solid ${testResult.ok ? 'var(--success)' : 'var(--danger)'}`,
                  }}>
                    {testResult.ok ? `✓ ${testResult.message}` : `✕ ${testResult.error}`}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {isSet ? '更換新 Token' : '設定 Token'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="貼上 Ragic Personal API Key"
              />
              <button
                onClick={handleSave}
                disabled={!newToken.trim() || saving}
                style={{
                  padding: '9px 20px',
                  background: newToken.trim() && !saving ? 'var(--accent)' : '#e5e5e5',
                  color: newToken.trim() && !saving ? '#fff' : '#999',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  fontSize: '14px', fontWeight: '600',
                  cursor: newToken.trim() && !saving ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
            {saveResult && (
              <div style={{
                marginTop: '10px', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                background: saveResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: saveResult.ok ? 'var(--success)' : 'var(--danger)',
                borderLeft: `3px solid ${saveResult.ok ? 'var(--success)' : 'var(--danger)'}`,
              }}>
                {saveResult.ok ? `✓ ${saveResult.msg}` : `✕ ${saveResult.msg}`}
                {saveResult.ok && (
                  <span
                    style={{ marginLeft: '10px', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
                    onClick={handleTest}
                  >立即測試 →</span>
                )}
              </div>
            )}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              取得方式：登入 Ragic → 右上角帳號 → Account Settings → API Key
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
