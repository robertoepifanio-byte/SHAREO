/**
 * pricing.ts (mobile) — espelho de lib/pricing.ts do projeto web.
 * Mantido separado porque apps/mobile é um projeto Expo independente com
 * seu próprio tsconfig (paths @/* → ./apps/mobile/*). Não importar do web.
 *
 * Ao alterar a lógica de cálculo, atualizar também: lib/pricing.ts (web).
 */

/**
 * Calcula o valor total da reserva usando o melhor plano de preço disponível.
 * - 7+ dias → aplica pricePerWeek (se definido)
 * - 30+ dias → aplica pricePerMonth (se definido)
 * Todos os valores em centavos (inteiros).
 */
export function calcBookingTotal(
  days:           number,
  pricePerDay:    number,
  pricePerWeek?:  number | null,
  pricePerMonth?: number | null,
): { totalPrice: number; savings: number; period: "day" | "week" | "month" } {
  const naive = days * pricePerDay

  if (days >= 30 && pricePerMonth) {
    const months   = Math.floor(days / 30)
    const restDays = days % 30
    const total    = months * pricePerMonth + restDays * pricePerDay
    return {
      totalPrice: total,
      savings:    Math.max(0, naive - total),
      period:     "month",
    }
  }

  if (days >= 7 && pricePerWeek) {
    const weeks    = Math.floor(days / 7)
    const restDays = days % 7
    const total    = weeks * pricePerWeek + restDays * pricePerDay
    return {
      totalPrice: total,
      savings:    Math.max(0, naive - total),
      period:     "week",
    }
  }

  return { totalPrice: naive, savings: 0, period: "day" }
}

/** Formata centavos como BRL (ex: 3500 → "R$ 35,00") */
export const fmtCurrency = (cents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

/** Adiciona N dias a um objeto Date — retorna novo Date sem mutar o original */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Teto por locação (centavos) — espelha CHECKOUT_MAX_CENTS do web (D2) */
export const CHECKOUT_MAX_CENTS = 50_000
