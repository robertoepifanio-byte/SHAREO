/**
 * lib/referral.ts
 * Programa de indicação ShareO — R$15 para quem indica + R$15 para quem é indicado.
 * Créditos válidos por 90 dias e usáveis no primeiro aluguel concluído.
 */

import { prisma } from "@/lib/prisma"

export const REFERRAL_CREDIT_CENTS = 1_500  // R$15,00
export const REFERRAL_EXPIRY_DAYS  = 90
export const REFERRAL_APPLY_WINDOW_DAYS = 30 // código só pode ser aplicado nos primeiros 30 dias

// ─── Gerar código ─────────────────────────────────────────────────────────────

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

/** Retorna código existente ou cria um novo. */
export async function getOrCreateReferralCode(userId: string, name: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { referralCode: true },
  })
  if (user?.referralCode) return user.referralCode

  // Garantir unicidade (máx 5 tentativas)
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

// ─── Aplicar código ───────────────────────────────────────────────────────────

export type ApplyResult =
  | { success: true }
  | { success: false; error: string }

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

  const expiresAt = new Date(Date.now() + REFERRAL_EXPIRY_DAYS * 86_400_000)

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { referredById: referrer.id } }),
    prisma.referralCredit.create({
      data: { userId, amountCents: REFERRAL_CREDIT_CENTS, reason: `Bônus de boas-vindas — indicado por ${referrer.name}`, expiresAt },
    }),
    prisma.referralCredit.create({
      data: { userId: referrer.id, amountCents: REFERRAL_CREDIT_CENTS, reason: `Indicação aceita — novo usuário cadastrado`, expiresAt },
    }),
  ])

  // Notificações (fire-and-forget)
  prisma.notification.createMany({
    data: [
      { userId: referrer.id, type: "REFERRAL_CREDIT", title: "Indicação aceita! 🎉", body: `Você ganhou R$15,00 de crédito por indicar um novo usuário.`, data: {} },
      { userId,              type: "REFERRAL_CREDIT", title: "Bônus de boas-vindas! 🎉", body: `Você ganhou R$15,00 de crédito. Use no seu próximo aluguel.`, data: {} },
    ],
  }).catch(() => {})

  return { success: true }
}

// ─── Estatísticas ─────────────────────────────────────────────────────────────

export interface ReferralStats {
  code:             string | null
  totalReferrals:   number
  hasBeenReferred:  boolean
  availableBalance: number  // centavos
  credits:          { id: string; amountCents: number; reason: string; usedAt: Date | null; expiresAt: Date | null; createdAt: Date }[]
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [user, credits] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { referralCode: true, referredById: true, _count: { select: { referrals: true } } },
    }),
    prisma.referralCredit.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      select:  { id: true, amountCents: true, reason: true, usedAt: true, expiresAt: true, createdAt: true },
    }),
  ])

  const now = new Date()
  const availableBalance = credits
    .filter((c) => !c.usedAt && (!c.expiresAt || c.expiresAt > now))
    .reduce((sum, c) => sum + c.amountCents, 0)

  return {
    code:             user?.referralCode ?? null,
    totalReferrals:   user?._count.referrals ?? 0,
    hasBeenReferred:  !!(user?.referredById),
    availableBalance,
    credits,
  }
}
