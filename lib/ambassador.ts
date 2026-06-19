/**
 * lib/ambassador.ts
 * Programa de Embaixadores ShareO — ADR-022
 *
 * Tier: BRONZE (1–10) → 3% | SILVER (11–50) → 5% | GOLD (51+) → 7%
 * Percentual incide sobre platformFeeAmount (nunca sobre o GMV).
 * Payout bloqueado até D4 jurídico (flag "ambassadorPayoutEnabled" = "false" em PlatformConfig).
 */

import { prisma } from "@/lib/prisma"
import { getAmbassadorThresholds } from "@/lib/platform-config"
import type { AmbassadorTier, CommissionStatus } from "@prisma/client"

// ─── Tier logic (funções puras — testáveis sem banco) ─────────────────────────

export function getAmbassadorTier(
  activeReferrals:  number,
  silverThreshold = 11,
  goldThreshold   = 51,
): AmbassadorTier | null {
  if (activeReferrals >= goldThreshold)   return "GOLD"
  if (activeReferrals >= silverThreshold) return "SILVER"
  if (activeReferrals >= 1)               return "BRONZE"
  return null
}

/** Basis points por tier: 300 = 3%, 500 = 5%, 700 = 7% */
export function getTierCommissionRateBp(tier: AmbassadorTier): number {
  if (tier === "GOLD")   return 700
  if (tier === "SILVER") return 500
  return 300 // BRONZE
}

export function getTierLabel(tier: AmbassadorTier | null): string {
  if (tier === "GOLD")   return "Ouro"
  if (tier === "SILVER") return "Prata"
  if (tier === "BRONZE") return "Bronze"
  return "Sem tier"
}

/** Quantos indicados ativos faltam para o próximo tier */
export function tierProgress(
  activeCount:      number,
  silverThreshold = 11,
  goldThreshold   = 51,
): { nextTier: AmbassadorTier | null; needed: number } {
  if (activeCount < 1)                return { nextTier: "BRONZE", needed: 1 - activeCount }
  if (activeCount < silverThreshold)  return { nextTier: "SILVER", needed: silverThreshold - activeCount }
  if (activeCount < goldThreshold)    return { nextTier: "GOLD",   needed: goldThreshold - activeCount }
  return { nextTier: null, needed: 0 }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export interface AmbassadorStats {
  profile:          AmbassadorProfileSummary | null
  referralCode:     string | null
  totalReferrals:   number          // todos os indicados cadastrados
  activeReferrals:  number          // com reserva concluída nos últimos 12 meses
  pendingReferrals: number          // cadastrados, sem reserva paga ainda
  commissions: CommissionSummary[]
  totalPendingCents:  number
  totalPaidCents:     number
  payoutEnabled:    boolean
  hasBeenReferred:  boolean
}

interface AmbassadorProfileSummary {
  id:                           string
  currentTier:                  AmbassadorTier
  activeReferralsCnt:           number
  totalCommissionPendingCents:  number
  totalCommissionPaidCents:     number
  totalCommissionCancelledCents: number
  revokedAt:                    Date | null
}

interface CommissionSummary {
  id:           string
  amountCents:  number
  tierSnapshot: AmbassadorTier
  status:       CommissionStatus
  createdAt:    Date
  referralId:   string
}

export async function getAmbassadorStats(userId: string): Promise<AmbassadorStats> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  const [user, profile, referrals, payoutConfig] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { referralCode: true, referredById: true },
    }),
    prisma.ambassadorProfile.findUnique({
      where:  { userId },
      select: {
        id: true,
        currentTier: true,
        activeReferralsCnt: true,
        totalCommissionPendingCents: true,
        totalCommissionPaidCents: true,
        totalCommissionCancelledCents: true,
        revokedAt: true,
      },
    }),
    prisma.referral.findMany({
      where:   { referrerId: userId },
      select:  { id: true, status: true, activatedAt: true },
    }),
    prisma.platformConfig.findUnique({ where: { key: "ambassadorPayoutEnabled" }, select: { value: true } }),
  ])

  const commissions = profile
    ? await prisma.ambassadorCommission.findMany({
        where:   { ambassadorUserId: userId },
        orderBy: { createdAt: "desc" },
        take:    50,
        select:  { id: true, amountCents: true, tierSnapshot: true, status: true, createdAt: true, referralId: true },
      })
    : []

  const activeReferrals  = referrals.filter((r) => r.status === "ACTIVE" && r.activatedAt && r.activatedAt >= twelveMonthsAgo).length
  const pendingReferrals = referrals.filter((r) => r.status === "PENDING").length

  return {
    profile:         profile ?? null,
    referralCode:    user?.referralCode ?? null,
    totalReferrals:  referrals.length,
    activeReferrals,
    pendingReferrals,
    commissions,
    totalPendingCents: profile?.totalCommissionPendingCents ?? 0,
    totalPaidCents:    profile?.totalCommissionPaidCents ?? 0,
    payoutEnabled:     payoutConfig?.value === "true",
    hasBeenReferred:   !!(user?.referredById),
  }
}

// ─── Opt-in ────────────────────────────────────────────────────────────────────

export interface ConsentData {
  ip:          string
  userAgent:   string
  version?:    string
}

export async function createAmbassadorProfile(userId: string, consent: ConsentData) {
  return prisma.ambassadorProfile.upsert({
    where:  { userId },
    update: { revokedAt: null }, // reativar se havia revogado
    create: {
      id:              generateId(),
      userId,
      consentAt:       new Date(),
      consentVersion:  consent.version ?? "v1.0",
      consentIp:       consent.ip,
      consentUserAgent: consent.userAgent.slice(0, 500),
    },
  })
}

export async function revokeAmbassadorProfile(userId: string) {
  return prisma.ambassadorProfile.update({
    where: { userId },
    data:  { revokedAt: new Date() },
  })
}

// ─── Comissão ─────────────────────────────────────────────────────────────────

/**
 * Chamada pelo webhook Stripe quando checkout.session.completed (pagamento confirmado).
 * Ativa o Referral PENDING → ACTIVE se for a primeira reserva paga do indicado.
 * Gera AmbassadorCommission se o embaixador tiver profile ativo.
 */
export async function processAmbassadorOnBookingPaid(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      borrowerId:        true,
      platformFeeAmount: true,
      ambassadorCommissions: { select: { id: true }, take: 1 },
    },
  })

  if (!booking || !booking.platformFeeAmount) return
  if (booking.ambassadorCommissions.length > 0) return // idempotente

  // Verificar se o borrower tem um Referral
  const referral = await prisma.referral.findUnique({
    where:  { referredId: booking.borrowerId },
    select: { id: true, referrerId: true, status: true },
  })

  if (!referral) return

  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  // Ativar se PENDING (primeira reserva paga)
  let isActive = referral.status === "ACTIVE"
  if (referral.status === "PENDING") {
    await prisma.referral.update({
      where: { id: referral.id },
      data:  { status: "ACTIVE", activatedAt: new Date() },
    })
    isActive = true
  } else if (referral.status === "EXPIRED") {
    return // expirado não conta
  }

  if (!isActive) return

  // Buscar perfil do embaixador
  const ambassadorProfile = await prisma.ambassadorProfile.findUnique({
    where:  { userId: referral.referrerId },
    select: { id: true, revokedAt: true, activeReferralsCnt: true, currentTier: true },
  })

  if (!ambassadorProfile || ambassadorProfile.revokedAt) return

  // Calcular tier atual (recalcula a partir dos referrals reais para garantir precisão)
  const activeCount = await prisma.referral.count({
    where: {
      referrerId:  referral.referrerId,
      status:      "ACTIVE",
      activatedAt: { gte: twelveMonthsAgo },
    },
  })

  const { silverThreshold, goldThreshold } = await getAmbassadorThresholds()
  const currentTier = getAmbassadorTier(activeCount, silverThreshold, goldThreshold)
  if (!currentTier) return

  const tierPercentBp = getTierCommissionRateBp(currentTier)
  const amountCents   = Math.round(booking.platformFeeAmount * tierPercentBp / 10000)

  if (amountCents <= 0) return

  const previousTier = ambassadorProfile.currentTier
  const tierChanged  = currentTier !== previousTier

  // Criar comissão + atualizar totais em transação
  await prisma.$transaction([
    prisma.ambassadorCommission.create({
      data: {
        id:                  generateId(),
        ambassadorProfileId: ambassadorProfile.id,
        ambassadorUserId:    referral.referrerId,
        referralId:          referral.id,
        bookingId,
        tierSnapshot:        currentTier,
        tierPercentBp,
        platformFeeAmount:   booking.platformFeeAmount,
        amountCents,
        status:              "PENDING",
      },
    }),
    prisma.ambassadorProfile.update({
      where: { id: ambassadorProfile.id },
      data: {
        currentTier:                 currentTier,
        activeReferralsCnt:          activeCount,
        totalCommissionPendingCents: { increment: amountCents },
      },
    }),
  ])

  // Notificações fire-and-forget
  prisma.notification.create({
    data: {
      userId: referral.referrerId,
      type:   "AMBASSADOR_COMMISSION",
      title:  "Nova comissão gerada! 🏅",
      body:   `Você ganhou R$${(amountCents / 100).toFixed(2)} pela locação de um indicado (tier ${getTierLabel(currentTier)}).`,
      data:   { bookingId, amountCents, tier: currentTier },
    },
  }).catch(() => undefined)

  if (tierChanged) {
    prisma.notification.create({
      data: {
        userId: referral.referrerId,
        type:   "AMBASSADOR_TIER_UP",
        title:  `Você subiu para ${getTierLabel(currentTier)}! 🎉`,
        body:   `Sua comissão agora é de ${tierPercentBp / 100}% da taxa ShareO em cada locação de indicado.`,
        data:   { tier: currentTier, previousTier },
      },
    }).catch(() => undefined)
  }
}

/**
 * Cancela comissões de um booking (dispute, refund, cancel).
 * Chama após confirmar que o booking não resultará em pagamento.
 */
export async function cancelAmbassadorCommissions(bookingId: string, reason: string): Promise<void> {
  const commissions = await prisma.ambassadorCommission.findMany({
    where:  { bookingId, status: { in: ["PENDING", "APPROVED"] } },
    select: { id: true, ambassadorProfileId: true, amountCents: true, status: true },
  })

  if (commissions.length === 0) return

  await prisma.$transaction(
    commissions.flatMap((c) => [
      prisma.ambassadorCommission.update({
        where: { id: c.id },
        data:  { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
      }),
      prisma.ambassadorProfile.update({
        where: { id: c.ambassadorProfileId },
        data: {
          totalCommissionPendingCents:   { decrement: c.amountCents },
          totalCommissionCancelledCents: { increment: c.amountCents },
        },
      }),
    ])
  )
}

// ─── Decay cron helper ────────────────────────────────────────────────────────

/**
 * Expira Referrals cujo indicado não teve reserva paga nos últimos 12 meses.
 * Chamado pelo cron /api/cron/ambassador-decay (mensal).
 * Retorna IDs dos embaixadores afetados para recalcular tier.
 */
export async function expireStaleReferrals(): Promise<string[]> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  const stale = await prisma.referral.findMany({
    where: {
      status:      "ACTIVE",
      activatedAt: { lt: twelveMonthsAgo },
      referred: {
        bookingsAsBorrower: {
          none: {
            paymentStatus: "PAID",
            paidAt:        { gte: twelveMonthsAgo },
          },
        },
      },
    },
    select: { id: true, referrerId: true },
  })

  if (stale.length === 0) return []

  await prisma.referral.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data:  { status: "EXPIRED", expiredAt: new Date() },
  })

  const affectedReferrers = [...new Set(stale.map((r) => r.referrerId))]
  await recalcTiersForUsers(affectedReferrers)
  return affectedReferrers
}

async function recalcTiersForUsers(userIds: string[]): Promise<void> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  for (const userId of userIds) {
    const profile = await prisma.ambassadorProfile.findUnique({
      where:  { userId },
      select: { id: true, currentTier: true },
    })
    if (!profile) continue

    const activeCount = await prisma.referral.count({
      where: {
        referrerId:  userId,
        status:      "ACTIVE",
        activatedAt: { gte: twelveMonthsAgo },
      },
    })

    const thresholds = await getAmbassadorThresholds()
    const newTier = getAmbassadorTier(activeCount, thresholds.silverThreshold, thresholds.goldThreshold) ?? "BRONZE"

    await prisma.ambassadorProfile.update({
      where: { id: profile.id },
      data:  { currentTier: newTier, activeReferralsCnt: activeCount },
    })
  }
}

// ─── Admin stats ──────────────────────────────────────────────────────────────

export interface AmbassadorAdminStats {
  byTier: { tier: string; count: number }[]
  totalAmbassadors: number
  totalReferralsRegistered: number
  totalReferralsActive: number
  conversionRate: number
  totalCommissionsGeneratedCents: number
  totalCommissionsPaidCents: number
  totalCommissionsBlockedCents: number
}

export async function getAmbassadorAdminStats(since: Date): Promise<AmbassadorAdminStats> {
  const [profiles, referrals, commissions] = await Promise.all([
    prisma.ambassadorProfile.groupBy({
      by:    ["currentTier"],
      _count: { _all: true },
    }),
    prisma.referral.findMany({
      where:   { createdAt: { gte: since } },
      select:  { status: true },
    }),
    prisma.ambassadorCommission.aggregate({
      where: { createdAt: { gte: since } },
      _sum:  { amountCents: true },
    }),
  ])

  const [paidSum, blockedSum] = await Promise.all([
    prisma.ambassadorCommission.aggregate({
      where: { createdAt: { gte: since }, status: "PAID" },
      _sum:  { amountCents: true },
    }),
    prisma.ambassadorCommission.aggregate({
      where: { createdAt: { gte: since }, status: { in: ["PENDING", "APPROVED"] } },
      _sum:  { amountCents: true },
    }),
  ])

  const totalReferralsRegistered = referrals.length
  const totalReferralsActive     = referrals.filter((r) => r.status === "ACTIVE").length

  return {
    byTier: profiles.map((p) => ({ tier: p.currentTier, count: p._count._all })),
    totalAmbassadors: profiles.reduce((sum, p) => sum + p._count._all, 0),
    totalReferralsRegistered,
    totalReferralsActive,
    conversionRate: totalReferralsRegistered > 0
      ? Math.round((totalReferralsActive / totalReferralsRegistered) * 100)
      : 0,
    totalCommissionsGeneratedCents: commissions._sum.amountCents ?? 0,
    totalCommissionsPaidCents:      paidSum._sum.amountCents ?? 0,
    totalCommissionsBlockedCents:   blockedSum._sum.amountCents ?? 0,
  }
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
