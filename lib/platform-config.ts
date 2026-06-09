import { prisma } from "@/lib/prisma"

const DEFAULT_FEE_RATE = 1500 // 15% em basis points

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
