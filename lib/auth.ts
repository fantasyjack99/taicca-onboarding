import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from './db'

async function getAllowedEmails(): Promise<string[]> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'admin_emails' } })
    if (config) {
      const parsed = JSON.parse(config.value) as string[]
      if (parsed.length > 0) return parsed
    }
  } catch {
    // DB 連線失敗時 fallback 到 env
  }
  return (process.env.HR_ALLOWED_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() || ''
      if (!email.endsWith('@taicca.tw')) return false

      const allowedEmails = await getAllowedEmails()
      // 若清單為空則允許所有 @taicca.tw（初始狀態）
      if (allowedEmails.length > 0 && !allowedEmails.includes(email)) return false
      return true
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
