/**
 * co2.ts — Cálculo de economia de CO₂ gerada pelas locações concluídas no Shareo.
 *
 * Premissas:
 *  - Cada dia de locação evita a produção de um novo item equivalente.
 *  - Fator base: 0,5 kg de CO₂ economizados por booking-dia (dia × locação).
 *  - Equivalência de árvore: 1 árvore adulta absorve 21,77 kg CO₂/ano.
 *
 * Referência do fator de árvore:
 *   US Forest Service / EPA estimate: ~48 lbs (~21.77 kg) CO₂/tree/year.
 */

export const CO2_KG_PER_BOOKING_DAY = 0.5
export const CO2_KG_PER_TREE_PER_YEAR = 21.77

export interface CO2Savings {
  /** Quilogramas de CO₂ economizados */
  kgCO2: number
  /** Número equivalente de árvores (arredondado para 4 casas decimais) */
  treesEquivalent: number
}

/**
 * Calcula a economia de CO₂ gerada por um conjunto de locações concluídas.
 *
 * @param completedBookings - Quantidade de locações concluídas
 * @param avgDaysPerBooking - Média de dias por locação (padrão: 1)
 * @returns { kgCO2, treesEquivalent }
 */
export function calcCO2Savings(
  completedBookings: number,
  avgDaysPerBooking = 1,
): CO2Savings {
  const kgCO2 = completedBookings * avgDaysPerBooking * CO2_KG_PER_BOOKING_DAY
  const treesEquivalent =
    Math.round((kgCO2 / CO2_KG_PER_TREE_PER_YEAR) * 10_000) / 10_000
  return { kgCO2, treesEquivalent }
}
