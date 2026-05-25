'use client'
import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      style={{
        background: '#fff', border: '1px solid var(--border)',
        color: 'var(--text-secondary)', padding: '6px 14px',
        borderRadius: 'var(--radius-md)', fontSize: '12px',
        cursor: 'pointer', width: '100%', fontFamily: 'inherit',
        transition: 'all 150ms',
      }}
    >
      登出
    </button>
  )
}
