/**
 * Cada vitrine de categoria tem texto próprio, dentro do limite do Google.
 *
 * 🪤 A guarda que importa é a de UNICIDADE: se duas categorias voltarem a ter a mesma
 * description, o buscador as trata como a mesma página com o nome trocado.
 */
import { categorySeoText } from "@/lib/category-seo"

const SLUGS = ["ferramentas", "eletronicos", "casa-jardim", "construcao", "esporte", "festas"]

describe("categorySeoText", () => {
  const textos = SLUGS.map((slug) => categorySeoText({ slug, name: slug }))

  it.each(SLUGS)("%s: description até 160 caracteres e intro preenchida", (slug) => {
    const t = categorySeoText({ slug, name: slug })
    expect(t.description.length).toBeLessThanOrEqual(160)
    expect(t.description.length).toBeGreaterThan(80)
    expect(t.intro.length).toBeGreaterThan(80)
  })

  it("descriptions e intros são todas diferentes entre as categorias", () => {
    expect(new Set(textos.map((t) => t.description)).size).toBe(SLUGS.length)
    expect(new Set(textos.map((t) => t.intro)).size).toBe(SLUGS.length)
  })

  it("categoria sem texto próprio cai no genérico, com o nome e dentro do limite", () => {
    const t = categorySeoText({ slug: "nova", name: "Nova Categoria" })
    expect(t.description).toContain("Nova Categoria")
    expect(t.description.length).toBeLessThanOrEqual(160)
    expect(t.intro).toContain("Nova Categoria")
  })
})
