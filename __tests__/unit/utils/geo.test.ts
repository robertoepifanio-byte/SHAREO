/**
 * P3-84 — Testes unitários para utils/geo.ts e lib/haversine.ts
 *
 * haversineDistance (metros) foi removido de utils/geo.ts em P3-79 —
 * a função canônica é haversineKm em lib/haversine.ts (já testada em haversine.test.ts).
 */

import { buildSlug } from "@/utils/geo"
import { haversineKm } from "@/lib/haversine"

describe("buildSlug", () => {
  it("gera slug com formato correto", () => {
    const slug = buildSlug("Furadeira Bosch", "Recife", "PE", "abc123")
    expect(slug).toBe("furadeira-bosch-em-recife-pe-abc123")
  })

  it("normaliza acentos", () => {
    const slug = buildSlug("Câmera DSLR", "São Paulo", "SP", "id01")
    expect(slug).toBe("camera-dslr-em-sao-paulo-sp-id01")
  })

  it("converte para minúsculas", () => {
    const slug = buildSlug("DRONE DJI", "Fortaleza", "CE", "xyz")
    expect(slug).toBe("drone-dji-em-fortaleza-ce-xyz")
  })

  it("substitui espaços por hífens", () => {
    const slug = buildSlug("Mesa de Jantar", "Belo Horizonte", "MG", "99")
    expect(slug).toBe("mesa-de-jantar-em-belo-horizonte-mg-99")
  })

  it("remove caracteres especiais (não alfanuméricos)", () => {
    const slug = buildSlug("Sofá & Poltrona!", "Curitiba", "PR", "s1")
    expect(slug).toMatch(/^[a-z0-9-]+-em-[a-z0-9-]+-[a-z]{2}-s1$/)
    expect(slug).not.toContain("&")
    expect(slug).not.toContain("!")
  })

  it("UF normalizada para minúsculas", () => {
    const slug = buildSlug("Tenda", "Manaus", "AM", "t1")
    expect(slug).toMatch(/-am-t1$/)
  })

  it("id preservado no final do slug", () => {
    const id = "clxyz1234567890"
    const slug = buildSlug("Notebook", "Porto Alegre", "RS", id)
    expect(slug.endsWith(`-${id}`)).toBe(true)
  })

  it("título com múltiplos espaços é colapsado para um hífen", () => {
    const slug = buildSlug("Serra  Circular", "Salvador", "BA", "s2")
    expect(slug).toBe("serra-circular-em-salvador-ba-s2")
  })
})

describe("haversineKm (canônico — lib/haversine.ts)", () => {
  it("distância zero quando coordenadas são iguais", () => {
    expect(haversineKm(-8.05, -34.9, -8.05, -34.9)).toBe(0)
  })

  it("Recife → Natal ≈ 253 km", () => {
    const dist = haversineKm(-8.05, -34.9, -5.79, -35.2)
    expect(dist).toBeGreaterThan(250)
    expect(dist).toBeLessThan(260)
  })

  it("São Paulo → Rio de Janeiro ≈ 360 km", () => {
    const dist = haversineKm(-23.55, -46.63, -22.91, -43.17)
    expect(dist).toBeGreaterThan(350)
    expect(dist).toBeLessThan(380)
  })

  it("retorna quilômetros (não metros) — valor < 1000 entre cidades próximas", () => {
    const dist = haversineKm(-8.05, -34.9, -8.1, -35.0)
    expect(dist).toBeLessThan(20)
    expect(dist).toBeGreaterThan(0)
  })

  it("é simétrica — A→B == B→A", () => {
    const ab = haversineKm(-8.05, -34.9, -5.79, -35.2)
    const ba = haversineKm(-5.79, -35.2, -8.05, -34.9)
    expect(Math.abs(ab - ba)).toBeLessThan(0.001)
  })
})
