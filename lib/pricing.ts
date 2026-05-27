/**
 * Utilitários de precificação de reservas.
 * Pode ser importado em Server Components, API routes e Client Components.
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
