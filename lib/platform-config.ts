import { prisma } from "@/lib/prisma"

const DEFAULT_FEE_RATE = 1500 // 15% em basis points

// ─── Política de cancelamento ─────────────────────────────────────────────────

export interface CancellationConfig {
  fullRefundHours:    number // horas antes do início para reembolso total (default 24)
  partialRefundHours: number // horas antes do início para reembolso parcial (default 6)
  partialPercent:     number // percentual de reembolso na faixa do meio (default 70)
  latePercent:        number // percentual de reembolso na faixa mais curta (default 50)
}

const DEFAULT_CANCELLATION: CancellationConfig = {
  fullRefundHours:    24,
  partialRefundHours: 6,
  partialPercent:     70,
  latePercent:        50,
}

export async function getCancellationConfig(): Promise<CancellationConfig> {
  try {
    const keys = ["cancelationFullRefundHours", "cancelationPartialRefundHours", "cancelationPartialPercent", "cancelationLatePercent"]
    const rows = await prisma.platformConfig.findMany({ where: { key: { in: keys } } })
    const map  = Object.fromEntries(rows.map((r) => [r.key, parseInt(r.value, 10)]))
    return {
      fullRefundHours:    Number.isFinite(map.cancelationFullRefundHours)    ? map.cancelationFullRefundHours    : DEFAULT_CANCELLATION.fullRefundHours,
      partialRefundHours: Number.isFinite(map.cancelationPartialRefundHours) ? map.cancelationPartialRefundHours : DEFAULT_CANCELLATION.partialRefundHours,
      partialPercent:     Number.isFinite(map.cancelationPartialPercent)     ? map.cancelationPartialPercent     : DEFAULT_CANCELLATION.partialPercent,
      latePercent:        Number.isFinite(map.cancelationLatePercent)        ? map.cancelationLatePercent        : DEFAULT_CANCELLATION.latePercent,
    }
  } catch {
    return DEFAULT_CANCELLATION
  }
}

// ─── Thresholds de embaixador ─────────────────────────────────────────────────

export interface AmbassadorThresholds {
  silverThreshold: number // indicados ativos para tier Prata (default 11)
  goldThreshold:   number // indicados ativos para tier Ouro (default 51)
}

const DEFAULT_AMBASSADOR_THRESHOLDS: AmbassadorThresholds = { silverThreshold: 11, goldThreshold: 51 }

export async function getAmbassadorThresholds(): Promise<AmbassadorThresholds> {
  try {
    const rows = await prisma.platformConfig.findMany({
      where: { key: { in: ["ambassadorSilverThreshold", "ambassadorGoldThreshold"] } },
    })
    const map = Object.fromEntries(rows.map((r) => [r.key, parseInt(r.value, 10)]))
    return {
      silverThreshold: Number.isFinite(map.ambassadorSilverThreshold) ? map.ambassadorSilverThreshold : DEFAULT_AMBASSADOR_THRESHOLDS.silverThreshold,
      goldThreshold:   Number.isFinite(map.ambassadorGoldThreshold)   ? map.ambassadorGoldThreshold   : DEFAULT_AMBASSADOR_THRESHOLDS.goldThreshold,
    }
  } catch {
    return DEFAULT_AMBASSADOR_THRESHOLDS
  }
}

// ─── Janela de referral ───────────────────────────────────────────────────────

const DEFAULT_REFERRAL_WINDOW_DAYS = 30

export async function getReferralWindowDays(): Promise<number> {
  try {
    const row = await prisma.platformConfig.findUnique({ where: { key: "referralWindowDays" } })
    if (!row) return DEFAULT_REFERRAL_WINDOW_DAYS
    const v = parseInt(row.value, 10)
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_REFERRAL_WINDOW_DAYS
  } catch {
    return DEFAULT_REFERRAL_WINDOW_DAYS
  }
}

// ─── Multiplicador de taxa de atraso ─────────────────────────────────────────

// Armazenado como inteiro × 100 (ex: 150 = 1.5×). Default 150.
const DEFAULT_LATE_FEE_MULTIPLIER_X100 = 150

export async function getLateFeeMultiplier(): Promise<number> {
  try {
    const row = await prisma.platformConfig.findUnique({ where: { key: "lateFeeMultiplierX100" } })
    if (!row) return DEFAULT_LATE_FEE_MULTIPLIER_X100 / 100
    const v = parseInt(row.value, 10)
    return Number.isFinite(v) && v > 0 ? v / 100 : DEFAULT_LATE_FEE_MULTIPLIER_X100 / 100
  } catch {
    return DEFAULT_LATE_FEE_MULTIPLIER_X100 / 100
  }
}

/**
 * Lê a taxa da plataforma do banco. Retorna o padrão (1500) se não encontrar.
 * Nunca lança exceção — usado no caminho crítico do checkout.
 */
export async function getPlatformFeeRate(): Promise<number> {
  try {
    const config = await prisma.platformConfig.findUnique({ where: { key: "platformFeeRate" } })
    if (!config) return DEFAULT_FEE_RATE
    const rate = parseInt(config.value, 10)
    return isNaN(rate) || rate < 0 || rate > 10000 ? DEFAULT_FEE_RATE : rate
  } catch {
    return DEFAULT_FEE_RATE
  }
}

/** Calcula os valores financeiros de uma reserva. Todos os valores em centavos. */
export function calcSplit(totalPrice: number, feeRate: number) {
  const platformFeeAmount = Math.round(totalPrice * feeRate / 10000)
  const ownerNetAmount    = totalPrice - platformFeeAmount
  return { platformFeeRate: feeRate, platformFeeAmount, ownerNetAmount }
}

export const CHECKOUT_MAX_CENTS = 50_000 // R$ 500,00 — teto MVP (D2)

const DEFAULT_WEEKLY_MULTIPLIER  = 3   // preço semanal = 3× diária
const DEFAULT_MONTHLY_MULTIPLIER = 15  // preço mensal  = 15× diária

/**
 * Lê os multiplicadores de precificação sugeridos do banco.
 * Nunca lança exceção — usado no formulário de anúncio.
 */
export async function getPricingMultipliers(): Promise<{ weeklyMultiplier: number; monthlyMultiplier: number }> {
  try {
    const [weekly, monthly] = await Promise.all([
      prisma.platformConfig.findUnique({ where: { key: "pricingWeeklyMultiplier" } }),
      prisma.platformConfig.findUnique({ where: { key: "pricingMonthlyMultiplier" } }),
    ])
    const w = weekly  ? parseInt(weekly.value,  10) : DEFAULT_WEEKLY_MULTIPLIER
    const m = monthly ? parseInt(monthly.value, 10) : DEFAULT_MONTHLY_MULTIPLIER
    return {
      weeklyMultiplier:  isNaN(w) || w < 1 || w > 52 ? DEFAULT_WEEKLY_MULTIPLIER  : w,
      monthlyMultiplier: isNaN(m) || m < 1 || m > 90 ? DEFAULT_MONTHLY_MULTIPLIER : m,
    }
  } catch {
    return { weeklyMultiplier: DEFAULT_WEEKLY_MULTIPLIER, monthlyMultiplier: DEFAULT_MONTHLY_MULTIPLIER }
  }
}
