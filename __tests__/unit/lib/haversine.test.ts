/**
 * P2-42 — Testes unitários para lib/haversine.ts
 *
 * A função `haversineKm` retorna a distância em QUILÔMETROS entre dois pontos
 * geográficos (lat/lng em graus decimais). Todos os expects deste arquivo
 * trabalham com essa unidade — km.
 */

import { haversineKm } from "@/lib/haversine"

describe("haversineKm", () => {
  describe("pontos idênticos", () => {
    it("dois pontos exatamente iguais retornam distância 0", () => {
      expect(haversineKm(-8.0476, -34.877, -8.0476, -34.877)).toBe(0)
    })
  })

  describe("distâncias de referência em território brasileiro", () => {
    it("Recife → Natal: resultado entre 245 e 265 km (distância linear ~253 km)", () => {
      // Recife, PE: -8.0476, -34.8770
      // Natal,  RN: -5.7945, -35.2110
      // Distância linear (crow-flies) medida pelo haversine: ~253 km.
      // Nota: a distância rodoviária (~282 km) é maior — aqui testamos distância geodésica.
      const dist = haversineKm(-8.0476, -34.877, -5.7945, -35.211)
      expect(dist).toBeGreaterThan(245)
      expect(dist).toBeLessThan(265)
    })

    it("São Paulo → Rio de Janeiro: resultado entre 355 e 370 km", () => {
      // São Paulo, SP: -23.5505, -46.6333
      // Rio de Janeiro, RJ: -22.9068, -43.1729
      const dist = haversineKm(-23.5505, -46.6333, -22.9068, -43.1729)
      expect(dist).toBeGreaterThan(355)
      expect(dist).toBeLessThan(370)
    })
  })

  describe("coordenadas negativas (hemisfério sul/oeste)", () => {
    it("aceita lat e lng negativos sem retornar NaN ou valor negativo", () => {
      // Fortaleza → Manaus — ambos com lat e lng negativos
      const dist = haversineKm(-3.7172, -38.5433, -3.1019, -60.025)
      expect(dist).not.toBeNaN()
      expect(dist).toBeGreaterThan(0)
    })

    it("ponto no hemisfério sul extremo (Ushuaia) → distância plausível com São Paulo", () => {
      // Ushuaia, Argentina: -54.8019, -68.3030
      const dist = haversineKm(-23.5505, -46.6333, -54.8019, -68.303)
      // Distância real aproximada: ~3500 km
      expect(dist).toBeGreaterThan(3000)
      expect(dist).toBeLessThan(4000)
    })
  })

  describe("simetria", () => {
    it("haversineKm(A, B) === haversineKm(B, A)", () => {
      const lat1 = -8.0476
      const lng1 = -34.877
      const lat2 = -5.7945
      const lng2 = -35.211
      expect(haversineKm(lat1, lng1, lat2, lng2)).toBe(haversineKm(lat2, lng2, lat1, lng1))
    })

    it("simetria mantida para ponto no equador → ponto no hemisfério norte", () => {
      // Belém (próximo ao equador) → Miami
      const dist1 = haversineKm(-1.4558, -48.5039, 25.7617, -80.1918)
      const dist2 = haversineKm(25.7617, -80.1918, -1.4558, -48.5039)
      expect(dist1).toBeCloseTo(dist2, 8)
    })
  })

  describe("unidade de retorno (km)", () => {
    it("distância Recife → Natal está na ordem de centenas (km), não dezenas de milhares (metros)", () => {
      const dist = haversineKm(-8.0476, -34.877, -5.7945, -35.211)
      // Em metros seria ~282000; em km deve ser ~282
      expect(dist).toBeGreaterThan(100)
      expect(dist).toBeLessThan(1000)
    })
  })
})
