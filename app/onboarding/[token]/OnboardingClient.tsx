'use client'
import { useState, useRef, useCallback } from 'react'
import { type Lang, common, onboardingT } from '@/lib/i18n'

interface Props {
  token: string
  name: string
  department: string
  division: string
  title: string
  startDate: string
  ragicUnavailable: boolean
}

// ── 名片預覽元件 ──────────────────────────────────────
// 參考 TAICCA 實體名片設計：白底、紅色 ">" Logo、雙欄排版
interface CardProps {
  chineseName: string
  englishCardName: string   // "First LASTNAME" 格式，可自訂
  department: string
  division: string
  email: string             // 完整 @taicca.tw 信箱（或空字串）
  showPhone: boolean | null
  phoneNumber: string
}

function BusinessCardPreview({ chineseName, englishCardName, department, division, email, showPhone, phoneNumber }: CardProps) {
  const deptLine = division && division !== '（本室）' && division !== '（直屬）'
    ? `${department}　${division}`
    : department

  // 永遠套用正確大小寫：姓氏全大寫，名字首字大寫
  const formattedName = (() => {
    if (!englishCardName?.trim()) return ''
    const tokens = englishCardName.trim().split(/\s+/).filter(Boolean)
    return tokens.map((tok, i) => {
      if (i === tokens.length - 1) return tok.toUpperCase()
      if (tok.includes('.')) return tok
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase()
    }).join(' ')
  })()

  return (
    <div style={{
      width: '100%',
      aspectRatio: '90 / 54',
      background: '#ffffff',
      borderRadius: '6px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
      padding: '17px 20px 14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: '"Microsoft JhengHei", "微軟正黑體", "PingFang TC", sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 預覽浮水印 */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '52px', fontWeight: '900', color: '#c8362b',
        opacity: 0.12, pointerEvents: 'none', whiteSpace: 'nowrap',
        letterSpacing: '0.15em', userSelect: 'none',
        fontFamily: '"Microsoft JhengHei", "微軟正黑體", sans-serif',
      }}>
        預覽
      </div>

      {/* 頂部：Logo + 處室 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* TAICCA 紅色 ">" Logo */}
        <svg width="26" height="19" viewBox="0 0 22 16" fill="none">
          <path d="M0 0L11 8L0 16" stroke="#c8362b" strokeWidth="3.5" fill="none" strokeLinejoin="round"/>
          <path d="M8 0L19 8L8 16" stroke="#c8362b" strokeWidth="3.5" fill="none" strokeLinejoin="round"/>
        </svg>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', color: '#444', letterSpacing: '0.01em', lineHeight: 1.4 }}>
            {deptLine || '處室'}
          </div>
          <div style={{ fontSize: '7.5px', color: '#888', letterSpacing: '0.01em' }}>
            Administration
          </div>
        </div>
      </div>

      {/* 中間：姓名（左）+ 聯絡（右） */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, margin: '8px 0 6px' }}>
        {/* 左：中文名 + 英文名 */}
        <div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#1a1a1a',
            letterSpacing: '0.18em',
            lineHeight: 1.3,
          }}>
            {chineseName || '姓名'}
          </div>
          <div style={{
            fontSize: '10px',
            color: '#333',
            letterSpacing: '0.06em',
            marginTop: '3px',
            fontWeight: '500',
          }}>
            {formattedName || 'First LASTNAME'}
          </div>
        </div>

        {/* 右：聯絡資訊 */}
        <div style={{ textAlign: 'right', fontSize: '8px', color: '#444', lineHeight: 1.7 }}>
          <div style={{ color: email ? '#1a1a1a' : '#aaa' }}>
            {email || 'name@taicca.tw'}
          </div>
          <div>T +886 2 2745 8186 #xxx</div>
          {showPhone && phoneNumber && (
            <div style={{ color: '#1a1a1a' }}>M {phoneNumber}</div>
          )}
        </div>
      </div>

      {/* 底部：機構資訊 */}
      <div style={{ borderTop: '0.5px solid #e8e8e8', paddingTop: '7px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '0.05em' }}>文化內容策進院</div>
          <div style={{ fontSize: '7px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '0.06em', marginTop: '1px' }}>
            TAIWAN CREATIVE CONTENT AGENCY
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '6.5px', color: '#888', lineHeight: 1.5 }}>
          <div>105402台北市松山區民生東路三段158號5樓</div>
          <div>5F, No.158, Sec.3, Minsheng E. Rd., Taipei</div>
          <div>統編 76306972</div>
        </div>
      </div>
    </div>
  )
}

// ── 主表單 ────────────────────────────────────────────
export default function OnboardingClient({
  token, name, department, division, title, startDate, ragicUnavailable,
}: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [lang, setLang] = useState<Lang>('zh')
  const t = onboardingT[lang]
  const c = common[lang]

  // 信箱：英文名 + 英文姓
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const emailPreview = firstName && lastName
    ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@taicca.tw`
    : ''

  // 名片英文姓名 — 預設格式：First LASTNAME（姓氏全大寫，符合 TAICCA 名片規範）
  const [cardNameCustom, setCardNameCustom] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardNameWarn, setCardNameWarn] = useState(false)
  // 預設：capitalize(first) + UPPER(last)，例 "Mars CHENG"
  const derivedCardName = firstName && lastName
    ? `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()} ${lastName.toUpperCase()}`
    : ''
  // 名片顯示用的英文名（自訂 or 預設）
  const displayCardName = cardNameCustom ? cardName : derivedCardName

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
          englishName:  displayCardName,
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

  // ── 感謝頁 ─────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', padding: '32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>✓</div>
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--success)', fontFamily: '"Noto Serif TC",serif' }}>
          {t.thankYouTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: '360px' }}>
          {t.thankYouMsg}
        </p>
        <div style={{ marginTop: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
          {c.contactUs}
        </div>
      </div>
    )
  }

  // ── 共用樣式 ───────────────────────────────────────
  const inputBase: React.CSSProperties = {
    padding: '10px 14px', background: '#fff',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
    width: '100%', outline: 'none', transition: 'border-color 200ms',
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '7px' }}>
      {children} <span style={{ color: 'var(--danger)' }}>*</span>
    </label>
  )

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* 頁首 */}
      <div style={{ background: 'var(--accent)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', letterSpacing: '0.15em' }}>
            {t.org}
          </div>
          <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginTop: '2px' }}>
            {t.header}
          </div>
        </div>
        {/* 語言切換 */}
        <button
          type="button"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff', borderRadius: '20px', padding: '5px 14px',
            fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          {c.langToggle}
        </button>
      </div>

      {/* 外層容器：桌機版雙欄，手機版單欄 */}
      <div style={{
        maxWidth: '960px', margin: '0 auto', padding: '28px 24px 96px',
        display: 'flex', gap: '32px', alignItems: 'flex-start',
      }}>

        {/* ── 左欄：表單 ── */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>

          {/* 個人資料摘要 */}
          <div style={{
            background: '#fff', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '28px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t.summaryLabel}</div>
            <div style={{ fontWeight: '700', fontSize: '17px', marginBottom: '4px' }}>{name}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {department}　{division}｜{title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.startDate}：{startDate}</div>
          </div>

          {ragicUnavailable && (
            <div style={{
              background: 'rgba(176,125,0,0.08)', borderLeft: '3px solid var(--warning)',
              padding: '10px 14px', borderRadius: '2px', marginBottom: '20px',
              fontSize: '13px', color: 'var(--warning)',
            }}>
              {t.ragicWarn}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ① 公司信箱 */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <Label>{t.emailSection}</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="text" style={{ ...inputBase, flex: 1 }} value={firstName}
                  onChange={(e) => { const v = e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase(); setFirstName(v); checkEmail(v, lastName) }}
                  placeholder={t.emailFirst} />
                <span style={{ color: 'var(--text-muted)', fontSize: '20px', fontWeight: '200', flexShrink: 0 }}>.</span>
                <input type="text" style={{ ...inputBase, flex: 1 }} value={lastName}
                  onChange={(e) => { const v = e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase(); setLastName(v); checkEmail(firstName, v) }}
                  placeholder={t.emailLast} />
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', flexShrink: 0 }}>@taicca.tw</span>
              </div>
              {emailPreview && (
                <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                  background: emailStatus === 'ok' ? 'var(--success-bg)' : emailStatus === 'taken' ? 'var(--danger-bg)' : '#f0f0f0',
                  color: emailStatus === 'ok' ? 'var(--success)' : emailStatus === 'taken' ? 'var(--danger)' : 'var(--text-muted)',
                }}>
                  {emailStatus === 'ok' && '✓'}{emailStatus === 'taken' && '✕'}{emailStatus === 'checking' && '⏳'}{emailStatus === 'idle' && '→'}
                  <strong>{emailPreview}</strong>
                  {emailStatus === 'checking' && `　${t.emailPreviewChecking}`}
                  {emailStatus === 'ok' && `　${t.emailPreviewOk}`}
                  {emailStatus === 'taken' && `　${t.emailPreviewTaken}`}
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{t.emailHint}</div>
            </div>

            {/* ② 名片英文姓名 */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <Label>{t.cardNameSection}</Label>
              <input type="text" style={{ ...inputBase, background: cardNameCustom ? '#fff' : '#f7f7f7', color: cardNameCustom ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                value={cardNameCustom ? cardName : derivedCardName}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z\s.,'-]/g, '')
                  setCardName(v)
                  setCardNameCustom(true)
                  setCardNameWarn(false)
                }}
                onBlur={() => {
                  if (cardNameCustom && cardName.trim()) {
                    const tokens = cardName.trim().split(/\s+/).filter(Boolean)
                    const formatted = tokens.map((tok, i) => {
                      if (i === tokens.length - 1) return tok.toUpperCase()
                      if (tok.includes('.')) return tok
                      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase()
                    }).join(' ')
                    setCardName(formatted)
                    const last = formatted.trim().split(/\s+/).filter(Boolean).at(-1) ?? ''
                    setCardNameWarn(last !== last.toUpperCase())
                  }
                }}
                placeholder={t.cardNamePlaceholder} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={!cardNameCustom}
                  onChange={(e) => { setCardNameCustom(!e.target.checked); if (e.target.checked) { setCardName(''); setCardNameWarn(false) } }} />
                {t.cardNameSameAs}（{derivedCardName || t.cardNamePlaceholder}）
              </label>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{t.cardNameHint}</div>
              {cardNameCustom && cardNameWarn && (
                <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>⚠ {t.cardNameWarn}</div>
              )}
            </div>

            {/* ③ 名片顯示手機 */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <Label>{t.showPhoneSection}</Label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {([true, false] as const).map((val) => (
                  <label key={String(val)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px',
                    flex: 1, padding: '11px 16px',
                    background: showPhone === val ? 'rgba(200,54,43,0.05)' : '#fafafa',
                    border: `1.5px solid ${showPhone === val ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', transition: 'all 150ms', userSelect: 'none',
                  }}>
                    <input type="radio" name="showPhone" checked={showPhone === val}
                      onChange={() => { setShowPhone(val); if (!val) setPhoneNumber('') }}
                      style={{ accentColor: 'var(--accent)' }} />
                    {val ? t.showPhoneYes : t.showPhoneNo}
                  </label>
                ))}
              </div>
              {showPhone === true && (
                <div style={{ marginTop: '14px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    {t.phoneLabel} <span style={{ color: 'var(--danger)' }}>*</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '6px' }}>{t.phoneNote}</span>
                  </label>
                  <input type="tel" style={inputBase} value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\-\s]/g, ''))}
                    placeholder={t.phonePlaceholder} autoComplete="tel" autoFocus />
                </div>
              )}
            </div>

            {/* ④ 照片 */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <Label>{t.photoSection}</Label>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{t.photoHint}</div>
              {photoPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={photoPreview} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                  <div>
                    {photoUploading && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t.photoUploading}</div>}
                    {photoUploaded && <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>{t.photoSuccess}</div>}
                    {photoError && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>✕ {photoError}</div>}
                    <button type="button" onClick={() => fileRef.current?.click()} style={{ marginTop: '8px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t.photoReupload}
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePhotoChange(f) }}
                  style={{ border: '2px dashed var(--border)', borderRadius: '6px', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', background: '#fafafa' }}>
                  {t.photoUpload}
                  {photoError && <div style={{ color: 'var(--danger)', marginTop: '8px', fontSize: '13px' }}>✕ {photoError}</div>}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f) }} />
            </div>

            {submitError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '4px', fontSize: '13px' }}>
                {submitError}
              </div>
            )}

            {/* 確認送出（sticky） */}
            <div style={{ position: 'sticky', bottom: '16px', zIndex: 10 }}>
              <button type="submit" disabled={!isValid || submitting} style={{
                width: '100%', padding: '16px',
                background: isValid && !submitting ? 'var(--accent)' : '#ddd',
                color: isValid && !submitting ? '#fff' : '#aaa',
                border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '700',
                cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transition: 'all 200ms',
              }}>
                {submitting ? c.submitting : c.submit}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            {c.org}<br />{c.contactUs}
          </div>
        </div>

        {/* ── 右欄：名片預覽（桌機 sticky，手機隱藏至表單下方） ── */}
        <div style={{
          width: '430px', flexShrink: 0,
          position: 'sticky', top: '24px',
          // 手機版隱藏
        }}
          className="card-preview-col"
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {lang === 'zh' ? '名片預覽' : 'Business Card Preview'}
          </div>
          <BusinessCardPreview
            chineseName={name}
            englishCardName={displayCardName}
            department={department}
            division={division}
            email={emailPreview}
            showPhone={showPhone}
            phoneNumber={phoneNumber}
          />
          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {lang === 'zh' ? '✦ 預覽僅供參考，實際名片由人資部門確認後印製' : '✦ Preview only — final card confirmed by HR'}
          </div>
        </div>
      </div>

      {/* 手機版名片預覽（在表單下方） */}
      <style>{`
        @media (max-width: 767px) {
          .card-preview-col {
            display: none !important;
          }
        }
        @media (min-width: 768px) {
          .card-preview-col {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
