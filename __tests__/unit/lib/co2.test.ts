/**
 * P2-44 — Testes unitários para lib/co2.ts
 *
 * lib/co2.ts não existia no projeto — foi criado com base na spec:
 *   - Fator base: 0,5 kg CO₂ por booking-dia
 *   - treesEquivalent = kgCO2 / 21,77 (1 árvore absorve 21,77 kg CO₂/ano)
 *
 * Arquivo fonte: lib/co2.ts
 */

import {
  calcCO2Savings,
  CO2_KG_PER_BOOKING_DAY,
  CO2_KG_PER_TREE_PER_YEAR,
} from "@/lib/co2"

describe("calcCO2Savings", () => {
  describe("fator base: 1 booking de 1 dia", () => {
    it("1 booking, 1 dia → kgCO2 = 0.5", () => {
      const { kgCO2 } = calcCO2Savings(1, 1)
      expect(kgCO2).toBe(0.5)
    })

    it("1 booking, 1 dia → treesEquivalent = 0.5 / 21.77", () => {
      const { treesEquivalent } = calcCO2Savings(1, 1)
      const expected = 0.5 / CO2_KG_PER_TREE_PER_YEAR
      expect(treesEquivalent).toBeCloseTo(expected, 4)
    })
  })

  describe("avgDaysPerBooking padrão é 1", () => {
    it("omitir avgDaysPerBooking equivale a passar 1", () => {
      const comDefault  = calcCO2Savings(5)
      const comExplicito = calcCO2Savings(5, 1)
      expect(comDefault.kgCO2).toBe(comExplicito.kgCO2)
      expect(comDefault.treesEquivalent).toBe(comExplicito.treesEquivalent)
    })
  })

  describe("múltiplos bookings e dias", () => {
    it("10 bookings de 3 dias → kgCO2 = 15", () => {
      const { kgCO2 } = calcCO2Savings(10, 3)
      expect(kgCO2).toBe(10 * 3 * CO2_KG_PER_BOOKING_DAY)
      expect(kgCO2).toBe(15)
    })

    it("100 bookings de 7 dias → kgCO2 = 350", () => {
      const { kgCO2 } = calcCO2Savings(100, 7)
      expect(kgCO2).toBe(350)
    })

    it("treesEquivalent aumenta proporcionalmente ao aumentar bookings", () => {
      const um   = calcCO2Savings(10, 1)
      const dois = calcCO2Savings(20, 1)
      // Precisão de 3 casas decimais: o arredondamento interno (round x10000/10000)
      // pode gerar diferença de 1 ULP na 4ª casa ao dobrar o valor.
      expect(dois.treesEquivalent).toBeCloseTo(um.treesEquivalent * 2, 3)
    })
  })

  describe("0 bookings", () => {
    it("0 bookings → kgCO2 = 0 e treesEquivalent = 0", () => {
      const result = calcCO2Savings(0)
      expect(result.kgCO2).toBe(0)
      expect(result.treesEquivalent).toBe(0)
    })
  })

  describe("campos de retorno", () => {
    it("retorna objeto com kgCO2 e treesEquivalent", () => {
      const result = calcCO2Savings(5, 2)
      expect(result).toHaveProperty("kgCO2")
      expect(result).toHaveProperty("treesEquivalent")
    })

    it("kgCO2 é número finito e não-negativo", () => {
      const { kgCO2 } = calcCO2Savings(1000, 30)
      expect(Number.isFinite(kgCO2)).toBe(true)
      expect(kgCO2).toBeGreaterThanOrEqual(0)
    })

    it("treesEquivalent é número finito e não-negativo", () => {
      const { treesEquivalent } = calcCO2Savings(1000, 30)
      expect(Number.isFinite(treesEquivalent)).toBe(true)
      expect(treesEquivalent).toBeGreaterThanOrEqual(0)
    })
  })

  describe("constantes exportadas", () => {
    it("CO2_KG_PER_BOOKING_DAY = 0.5", () => {
      expect(CO2_KG_PER_BOOKING_DAY).toBe(0.5)
    })

    it("CO2_KG_PER_TREE_PER_YEAR = 21.77", () => {
      expect(CO2_KG_PER_TREE_PER_YEAR).toBe(21.77)
    })
  })
})
