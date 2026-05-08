// Auth 保護改由 app/admin/layout.tsx 的 server-side auth() 處理
// middleware 只負責 NextAuth session 內部使用，不攔截路由
export { auth as default } from '@/lib/auth'

export const config = {
  matcher: [],
}
