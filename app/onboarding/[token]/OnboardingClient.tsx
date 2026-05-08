'use client'
import { useState, useRef, useCallback } from 'react'

interface Props {
  token: string
  name: string
  department: string
  division: string
  title: string
  startDate: string
  ragicUnavailable: boolean
}

export default function OnboardingClient({
  token, name, department, division, title, startDate, ragicUnavailable,
}: Props) {
  const [submitted, setSubmitted] = useState(false)

  // 信箱：英文名 + 英文姓
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const emailPreview = firstName && lastName
    ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@taicca.tw`
    : ''

  // 名片英文姓名
  const [cardNameCustom, setCardNameCustom] = useState(false)
  const [cardName, setCardName] = useState('')
  const derivedCardName = firstName && lastName ? `${firstName} ${lastName}` : ''

  // 顯示手機 + 手機號碼
  const [showPhone, setShowPhone] = useState<boolean | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')

  // 照片
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUploaded, setPhotoUploaded]   = useState(false)
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null)
  const [photoError, setPhotoError]         = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 信箱唯一性驗證
  const [emailStatus, setEmailStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 送出
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const checkEmail = useCallback((first: string, last: string) => {
    if (!first || !last) { setEmailStatus('idle'); return }
    setEmailStatus('checking')
    if (emailTimer.current) clearTimeout(emailTimer.current)
    emailTimer.current = setTimeout(async () => {
      try {
        const email = `${first.toLowerCase()}.${last.toLowerCase()}`
        const res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, taiccaEmail: email }),
        })
        const data = await res.json()
        setEmailStatus(data.emailTaken ? 'taken' : 'ok')
      } catch { setEmailStatus('idle') }
    }, 600)
  }, [token])

  async function handlePhotoChange(file: File) {
    setPhotoError('')
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoUploaded(false)
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch(`/api/upload?token=${token}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上傳失敗')
      setPhotoUploaded(true)
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : '上傳失敗')
      setPhotoPreview(null)
    } finally { setPhotoUploading(false) }
  }

  const isValid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    emailStatus === 'ok' &&
    showPhone !== null &&
    (showPhone ? phoneNumber.trim().length >= 6 : true) &&
    photoUploaded

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          englishFirst: firstName.trim(),
          englishLast:  lastName.trim(),
          englishName:  cardNameCustom ? cardName.trim() : derivedCardName,
          showPhone,
          phoneNumber:  showPhone ? phoneNumber.trim() : '',
          photoUploaded,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '送出失敗')
      }
      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : '送出失敗，請稍後再試')
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', padding: '32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>✓</div>
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--success)', fontFamily: '"Noto Serif TC",serif' }}>
          感謝您完成填寫
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: '360px' }}>
          您的資料已送出，人資同仁確認後將進一步與您聯絡。
        </p>
        <div style={{ marginTop: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
          如有任何問題，請聯絡：<br />
          陳佩芝 分機 602｜phyllis@taicca.tw
        </div>
      </div>
    )
  }

  // ── 共用樣式 ───────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    padding: '10px 14px',
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontFamily: 'inherit',
    width: '100%',
    outline: 'none',
    transition: 'border-color 200ms',
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '7px' }}>
      {children} <span style={{ color: 'var(--danger)' }}>*</span>
    </label>
  )

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* 頁首 */}
      <div style={{
        background: 'var(--accent)', padding: '18px 24px',
        display: 'flex', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', letterSpacing: '0.15em' }}>
            TAIWAN CREATIVE CONTENT AGENCY
          </div>
          <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginTop: '2px' }}>
            文化內容策進院｜新人報到填寫
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 24px 96px' }}>

        {/* 個人資料摘要 */}
        <div style={{
          background: '#fff', border: '1px solid var(--border)',
          borderLeft: '4px solid var(--accent)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '28px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>報到資料確認</div>
          <div style={{ fontWeight: '700', fontSize: '17px', marginBottom: '4px' }}>{name}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {department}　{division}｜{title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>到職日：{startDate}</div>
        </div>

        {ragicUnavailable && (
          <div style={{
            background: 'rgba(176,125,0,0.08)', borderLeft: '3px solid var(--warning)',
            padding: '10px 14px', borderRadius: '2px', marginBottom: '20px',
            fontSize: '13px', color: 'var(--warning)',
          }}>
            ⚠ 目前無法驗證信箱是否重複，填寫後將由人資同仁確認。
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ① 公司信箱 */}
          <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
          }}>
            <Label>公司電子信箱</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                style={{ ...inputBase, flex: 1 }}
                value={firstName}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z]/g, '')
                  setFirstName(v)
                  checkEmail(v, lastName)
                }}
                placeholder="英文名"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '20px', fontWeight: '200', flexShrink: 0 }}>.</span>
              <input
                type="text"
                style={{ ...inputBase, flex: 1 }}
                value={lastName}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z]/g, '')
                  setLastName(v)
                  checkEmail(firstName, v)
                }}
                placeholder="英文姓氏"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', flexShrink: 0 }}>@taicca.tw</span>
            </div>

            {/* 信箱預覽 */}
            {emailPreview && (
              <div style={{
                marginTop: '8px', padding: '8px 12px', borderRadius: '4px', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px',
                background: emailStatus === 'ok'     ? 'var(--success-bg)' :
                            emailStatus === 'taken'  ? 'var(--danger-bg)'  : '#f0f0f0',
                color:      emailStatus === 'ok'     ? 'var(--success)'    :
                            emailStatus === 'taken'  ? 'var(--danger)'     : 'var(--text-muted)',
              }}>
                {emailStatus === 'ok'      && '✓'}
                {emailStatus === 'taken'   && '✕'}
                {emailStatus === 'checking'&& '⏳'}
                {emailStatus === 'idle'    && '→'}
                <strong>{emailPreview}</strong>
                {emailStatus === 'checking' && '　確認中...'}
                {emailStatus === 'ok'       && '　可使用'}
                {emailStatus === 'taken'    && '　此信箱已存在，請更換'}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              格式：英文名.英文姓氏（僅限英文字母）
            </div>
          </div>

          {/* ② 名片英文姓名 */}
          <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
          }}>
            <Label>名片 / 識別證英文姓名</Label>
            <input
              type="text"
              style={{
                ...inputBase,
                background: cardNameCustom ? '#fff' : '#f7f7f7',
                color: cardNameCustom ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              value={cardNameCustom ? cardName : derivedCardName}
              onChange={(e) => { setCardName(e.target.value); setCardNameCustom(true) }}
              placeholder="First Last"
            />
            <label style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={!cardNameCustom}
                onChange={(e) => {
                  setCardNameCustom(!e.target.checked)
                  if (e.target.checked) setCardName('')
                }}
              />
              同信箱名稱自動帶入（{derivedCardName || 'First Last'}）
            </label>
          </div>

          {/* ③ 名片顯示手機 */}
          <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
          }}>
            <Label>名片是否顯示手機號碼</Label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {([true, false] as const).map((val) => (
                <label key={String(val)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  cursor: 'pointer', fontSize: '14px',
                  flex: 1, padding: '11px 16px',
                  background: showPhone === val ? 'rgba(200,54,43,0.05)' : '#fafafa',
                  border: `1.5px solid ${showPhone === val ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 150ms',
                  userSelect: 'none',
                }}>
                  <input
                    type="radio"
                    name="showPhone"
                    checked={showPhone === val}
                    onChange={() => { setShowPhone(val); if (!val) setPhoneNumber('') }}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {val ? '是，顯示' : '否，不顯示'}
                </label>
              ))}
            </div>

            {/* 手機號碼（條件出現） */}
            {showPhone === true && (
              <div style={{ marginTop: '14px' }}>
                <label style={{
                  fontSize: '13px', color: 'var(--text-secondary)',
                  display: 'block', marginBottom: '6px',
                }}>
                  手機號碼 <span style={{ color: 'var(--danger)' }}>*</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '6px' }}>
                    （將印製於名片上）
                  </span>
                </label>
                <input
                  type="tel"
                  style={inputBase}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                  placeholder="0912-345-678"
                  autoComplete="tel"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* ④ 照片 */}
          <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
          }}>
            <Label>照片電子檔</Label>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              正面清晰大頭照或證件照｜JPG / PNG｜上限 5MB
            </div>

            {photoPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={photoPreview} alt="預覽" style={{
                  width: '80px', height: '80px', objectFit: 'cover',
                  borderRadius: '6px', border: '1px solid var(--border)',
                }} />
                <div>
                  {photoUploading && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>上傳中...</div>}
                  {photoUploaded && <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>✓ 上傳成功</div>}
                  {photoError && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>✕ {photoError}</div>}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    style={{
                      marginTop: '8px', background: '#fff',
                      border: '1px solid var(--border)', color: 'var(--text-secondary)',
                      padding: '5px 12px', borderRadius: '4px',
                      fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >重新上傳</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePhotoChange(f) }}
                style={{
                  border: '2px dashed var(--border)', borderRadius: '6px',
                  padding: '32px 16px', textAlign: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px',
                  background: '#fafafa', transition: 'border-color 150ms',
                }}
              >
                點擊或拖曳上傳照片
                {photoError && (
                  <div style={{ color: 'var(--danger)', marginTop: '8px', fontSize: '13px' }}>
                    ✕ {photoError}
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f) }}
            />
          </div>

          {/* 錯誤訊息 */}
          {submitError && (
            <div style={{
              background: 'var(--danger-bg)', border: '1px solid var(--danger)',
              color: 'var(--danger)', padding: '10px 14px',
              borderRadius: '4px', fontSize: '13px',
            }}>
              {submitError}
            </div>
          )}

          {/* 確認送出（sticky） */}
          <div style={{ position: 'sticky', bottom: '16px', zIndex: 10 }}>
            <button
              type="submit"
              disabled={!isValid || submitting}
              style={{
                width: '100%', padding: '16px',
                background: isValid && !submitting ? 'var(--accent)' : '#ddd',
                color: isValid && !submitting ? '#fff' : '#aaa',
                border: 'none', borderRadius: '6px',
                fontSize: '16px', fontWeight: '700',
                cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                transition: 'all 200ms',
              }}
            >
              {submitting ? '送出中...' : '確認送出'}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '48px', paddingTop: '20px', borderTop: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center',
        }}>
          文化內容策進院｜行政管理處<br />
          陳佩芝 分機 602｜phyllis@taicca.tw
        </div>
      </div>
    </div>
  )
}
