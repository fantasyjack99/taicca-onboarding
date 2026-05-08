'use client'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-secondary)',
    }}>
      {/* Left: Brand panel */}
      <div style={{
        width: '420px', flexShrink: 0,
        background: 'var(--accent)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '64px 48px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', letterSpacing: '0.2em', marginBottom: '16px' }}>
          TAIWAN CREATIVE CONTENT AGENCY
        </div>
        <h1 style={{
          color: '#fff', fontSize: '28px', lineHeight: 1.4,
          fontFamily: '"Noto Serif TC", serif', marginBottom: '24px',
        }}>
          文化內容策進院
        </h1>
        <div style={{ width: '40px', height: '2px', background: 'rgba(255,255,255,0.5)', marginBottom: '24px' }} />
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: 1.8 }}>
          新人報到管理系統
        </p>
      </div>

      {/* Right: Login form */}
      <div style={{
        flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>人資管理員登入</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '36px' }}>
            限 @taicca.tw 人資帳號使用
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/admin' })}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '12px', width: '100%', padding: '13px 24px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 200ms',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--accent-light)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.85)"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="rgba(255,255,255,0.7)"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.6)"/>
            </svg>
            以 Google Workspace 帳號登入
          </button>

          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px', textAlign: 'center' }}>
            如有問題請聯絡資訊部門
          </p>
        </div>
      </div>
    </div>
  )
}
