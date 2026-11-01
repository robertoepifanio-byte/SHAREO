// Limites do Google: título 60 (com o sufixo do layout), descrição 160. Literais de propósito.
import { clip, itemSeoText, storeSeoText, pilotSeoText, TITLE_SUFFIX } from "@/lib/seo-text"
import { PILOT_CITIES } from "@/lib/pilot-cities"

describe("clip", () => {
  it("não toca em texto que cabe e colapsa espaços e quebras de linha", () => {
    expect(clip("  Furadeira \n  de impacto ", 50)).toBe("Furadeira de impacto")
  })
  it("corta no fim de uma palavra, com reticências, respeitando o limite", () => {
    const r = clip("Ventilador Torre FIX 86cm – 3 Velocidades, Oscilante e Timer", 51)
    expect(r.length).toBeLessThanOrEqual(51)
    expect(r.endsWith("…")).toBe(true)
    expect(r).not.toMatch(/ …$/)
  })
  it("não parte um emoji ao meio", () => {
    expect(clip("😀".repeat(30), 10)).toBe("😀".repeat(9) + "…")
  })
  it("palavra única maior que o limite é cortada seca", () => {
    expect(clip("a".repeat(100), 20)).toHaveLength(20)
  })
})

describe("itemSeoText", () => {
  const longo = { title: "x".repeat(10) + " " + "palavra ".repeat(20), description: "descrição ".repeat(40), city: "São Gonçalo do Amarante", state: "RN" }

  it("título + sufixo ≤ 60 e descrição com local ≤ 160", () => {
    const r = itemSeoText(longo)
    expect(r.title.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(60)
    expect(r.description.length).toBeLessThanOrEqual(160)
    expect(r.description.endsWith(" — São Gonçalo do Amarante, RN")).toBe(true)
  })
  it("sem cidade nem estado não deixa travessão solto", () => {
    expect(itemSeoText({ title: "Violão", description: "Bom estado." }).description).toBe("Bom estado.")
  })
})

describe("storeSeoText", () => {
  it("nome e bio longos cabem nos limites", () => {
    const r = storeSeoText({ name: "N".repeat(30) + " " + "sobrenome ".repeat(8), bio: "bio ".repeat(125) })
    expect(r.title.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(60)
    expect(r.ogTitle.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(60)
    expect(r.description.length).toBeLessThanOrEqual(160)
    expect(r.ogDescription.length).toBeLessThanOrEqual(160)
  })
  it("sem bio usa o texto padrão com o nome", () => {
    expect(storeSeoText({ name: "Zé", bio: null }).description).toContain("Zé")
  })
})

describe("pilotSeoText", () => {
  it.each(PILOT_CITIES.map((c) => [c.name, c] as const))("%s cabe nos limites", (_n, c) => {
    const r = pilotSeoText(c)
    expect(r.title.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(60)
    expect(r.description.length).toBeLessThanOrEqual(160)
  })
})
