export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: 'var(--accent)', fontSize: '14px', letterSpacing: '0.1em', marginBottom: '24px' }}>
        TAICCA
      </div>
      <h1 style={{ fontSize: '22px', marginBottom: '12px', fontFamily: '"Noto Serif TC", serif' }}>
        此連結無效或已過期
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        如需重新取得報到連結，請聯絡人資部門。
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
        陳佩芝 分機 602｜phyllis@taicca.tw
      </p>
    </div>
  )
}
