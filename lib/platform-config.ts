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
