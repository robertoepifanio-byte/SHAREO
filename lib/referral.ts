/**
 * lib/referral.ts
 * Programa de indicação ShareO — ADR-022 (Embaixadores)
 *
 * applyReferralCode agora cria um Referral(PENDING) em vez de crédito R$15.
 * A comissão é calculada e registrada em lib/ambassador.ts quando o booking é pago.
 */

import { prisma } from "@/lib/prisma"

export const REFERRAL_APPLY_WINDOW_DAYS = 30

// ─── Gerar código ──────────────────────────────────────────────────────────────

function makeCode(name: string): string {
  const prefix = name
    .split(" ")[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5)
    .padEnd(3, "X")
  const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "0")
  return `${prefix}-${suffix}`
}

export async function getOrCreateReferralCode(userId: string, name: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { referralCode: true },
  })
  if (user?.referralCode) return user.referralCode

  let code = ""
  for (let i = 0; i < 5; i++) {
    const candidate = makeCode(name)
    const clash = await prisma.user.findUnique({ where: { referralCode: candidate }, select: { id: true } })
    if (!clash) { code = candidate; break }
  }
  if (!code) code = `USER-${Date.now().toString(36).toUpperCase().slice(-6)}`

  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } })
  return code
}

// ─── Aplicar código ────────────────────────────────────────────────────────────

export type ApplyResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Vincula o usuário ao referrer criando um Referral(PENDING).
 * A comissão só é gerada após o primeiro booking pago (webhook Stripe → lib/ambassador.ts).
 */
export async function applyReferralCode(userId: string, rawCode: string): Promise<ApplyResult> {
  const code = rawCode.trim().toUpperCase()

  const referrer = await prisma.user.findUnique({
    where:  { referralCode: code },
    select: { id: true, name: true },
  })
  if (!referrer)             return { success: false, error: "Código de indicação inválido." }
  if (referrer.id === userId) return { success: false, error: "Você não pode usar seu próprio código." }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { referredById: true, createdAt: true },
  })
  if (!user) return { success: false, error: "Usuário não encontrado." }
  if (user.referredById) return { success: false, error: "Você já usou um código de indicação." }

  const daysSince = (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000
  if (daysSince > REFERRAL_APPLY_WINDOW_DAYS) {
    return { success: false, error: `O código só pode ser aplicado nos primeiros ${REFERRAL_APPLY_WINDOW_DAYS} dias após o cadastro.` }
  }

  // Verificar se já existe Referral (idempotência)
  const existing = await prisma.referral.findUnique({ where: { referredId: userId }, select: { id: true } })
  if (existing) return { success: false, error: "Você já usou um código de indicação." }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { referredById: referrer.id } }),
    prisma.referral.create({
      data: {
        id:         generateId(),
        referrerId: referrer.id,
        referredId: userId,
        status:     "PENDING",
      },
    }),
  ])

  return { success: true }
}

// ─── Estatísticas (compat — preferir getAmbassadorStats em lib/ambassador.ts) ──

export interface ReferralStats {
  code:            string | null
  totalReferrals:  number
  hasBeenReferred: boolean
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [user, referralCount] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { referralCode: true, referredById: true },
    }),
    prisma.referral.count({ where: { referrerId: userId } }),
  ])

  return {
    code:            user?.referralCode ?? null,
    totalReferrals:  referralCount,
    hasBeenReferred: !!(user?.referredById),
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
