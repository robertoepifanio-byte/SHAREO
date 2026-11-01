/** @jest-environment node */
/**
 * A vitrine de UMA categoria declara o próprio canonical (o sitemap a lista).
 *
 * 🪤 A guarda que importa é a de AUSÊNCIA: com qualquer outro parâmetro (busca,
 * ordenação, página) NÃO pode haver canonical próprio, senão cada combinação de filtro
 * viraria uma página indexável.
 */

const mockCategoryFindFirst = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: { category: { findFirst: (...a: unknown[]) => mockCategoryFindFirst(...a) } },
}))
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("@/components/layout/AppHeader", () => ({ AppHeader: () => null }))
jest.mock("@/components/items/ItemsMapLoader", () => ({ ItemsMapLoader: () => null }))
// Mesma cadeia `next-auth/react` (ESM) que o teste da vitrine corta no AppHeader.
jest.mock("@/components/items/FloatingCTA", () => ({ FloatingCTA: () => null }))

import { generateMetadata } from "@/app/itens/page"

const metaFor = (sp: Record<string, string>) =>
  generateMetadata({ searchParams: Promise.resolve(sp) })

beforeEach(() => {
  jest.clearAllMocks()
  mockCategoryFindFirst.mockResolvedValue({ id: "cat1", name: "Ferramentas" })
})

describe("generateMetadata de /itens", () => {
  it("categoria sozinha: título, descrição e canonical próprios", async () => {
    const m = await metaFor({ categoryId: "cat1" })
    expect(m.title).toBe("Alugar Ferramentas perto de você")
    expect(m.description).toContain("Ferramentas")
    expect(m.alternates?.canonical).toBe("/itens?categoryId=cat1")
  })

  it.each([
    ["busca", { categoryId: "cat1", search: "furadeira" }],
    ["ordenação", { categoryId: "cat1", sort: "price_asc" }],
    ["página", { categoryId: "cat1", page: "2" }],
  ])("categoria + %s não declara canonical próprio", async (_n, sp) => {
    const m = await metaFor(sp)
    expect(m.alternates).toBeUndefined()
    expect(m.title).toBe("Explorar anúncios")
    expect(mockCategoryFindFirst).not.toHaveBeenCalled()
  })

  it("sem parâmetros: título e descrição gerais, sem canonical próprio", async () => {
    const m = await metaFor({})
    expect(m.title).toBe("Explorar anúncios")
    expect((m.description ?? "").length).toBeGreaterThan(100)
    expect(m.alternates).toBeUndefined()
  })

  it("categoria inexistente cai no padrão, sem canonical próprio", async () => {
    mockCategoryFindFirst.mockResolvedValue(null)
    const m = await metaFor({ categoryId: "nao-existe" })
    expect(m.alternates).toBeUndefined()
    expect(m.title).toBe("Explorar anúncios")
  })
})
