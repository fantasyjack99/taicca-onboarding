import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '3px', height: '20px', background: 'var(--accent)', borderRadius: '2px' }} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '0.1em' }}>TAICCA</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '11px' }}>新人報到管理系統</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {[
            { href: '/admin', label: '報到管理' },
            { href: '/admin/email-template', label: '信件模板' },
            { href: '/admin/settings', label: '系統設定' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              display: 'block', padding: '10px 20px',
              color: 'var(--text-secondary)', textDecoration: 'none',
              fontSize: '14px',
            }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* User / Logout */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', wordBreak: 'break-all' }}>
            {session.user?.email}
          </div>
          <form method="POST" action="/api/auth/signout">
            <input type="hidden" name="callbackUrl" value="/login" />
            <button type="submit" style={{
              background: '#fff', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', padding: '6px 14px',
              borderRadius: 'var(--radius-md)', fontSize: '12px',
              cursor: 'pointer', width: '100%', fontFamily: 'inherit',
              transition: 'all 150ms',
            }}>登出</button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px', minHeight: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
