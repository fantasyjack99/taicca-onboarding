import { v4 as uuidv4 } from 'uuid'
import { prisma } from './db'
import { addDays } from './date'

export function generateToken(): string {
  return uuidv4()
}

export function tokenExpiryDate(startDate: Date): Date {
  return addDays(startDate, 30)
}

export type TokenValidationResult =
  | { valid: true; session: Awaited<ReturnType<typeof getSession>> }
  | { valid: false; error: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_SUBMITTED' }

async function getSession(token: string) {
  return prisma.onboardingSession.findUnique({ where: { token } })
}

export async function validateToken(token: string): Promise<TokenValidationResult> {
  const session = await getSession(token)
  if (!session) return { valid: false, error: 'NOT_FOUND' }
  if (new Date() > session.expiresAt) return { valid: false, error: 'EXPIRED' }
  if (session.status === 'SUBMITTED' || session.status === 'CONFIRMED') {
    return { valid: false, error: 'ALREADY_SUBMITTED' }
  }
  return { valid: true, session }
}
