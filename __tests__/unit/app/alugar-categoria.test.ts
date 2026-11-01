/** @jest-environment node */
/**
 * A vitrine de UMA categoria mora em `/alugar/<slug>` e é a única forma canônica.
 *
 * 🪤 As guardas que importam: `/itens?categoryId=` sozinho responde 308 para ela, mas com
 * QUALQUER outro parâmetro (busca, ordenação, página) a página continua em `/itens` — senão
 * a navegação com filtro seria sequestrada para a vitrine.
 */

const mockCategoryFindFirst = jest.fn()
const mockPermanentRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND")
})

jest.mock("@/lib/prisma", () => ({
  prisma: { category: { findFirst: (...a: unknown[]) => mockCategoryFindFirst(...a) } },
}))
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  permanentRedirect: (u: string) => mockPermanentRedirect(u),
  notFound: () => mockNotFound(),
}))
jest.mock("@/lib/auth", () => ({ auth: jest.fn().mockResolvedValue(null) }))
jest.mock("@/components/layout/AppHeader", () => ({ AppHeader: () => null }))
jest.mock("@/components/items/ItemsMapLoader", () => ({ ItemsMapLoader: () => null }))
jest.mock("@/components/items/FloatingCTA", () => ({ FloatingCTA: () => null }))

import { canonicalCategoryPath } from "@/lib/category-url"
import { Explorar } from "@/app/itens/_Explorar"
import { generateMetadata } from "@/app/alugar/[slug]/page"

const cat = { id: "cat1", slug: "ferramentas", name: "Ferramentas" }

beforeEach(() => {
  jest.clearAllMocks()
  mockCategoryFindFirst.mockResolvedValue(cat)
})

describe("canonicalCategoryPath", () => {
  it("usa o slug, não o id", () => {
    expect(canonicalCategoryPath(cat)).toBe("/alugar/ferramentas")
  })
})

describe("generateMetadata de /alugar/[slug]", () => {
  const meta = (slug: string) => generateMetadata({ params: Promise.resolve({ slug }) })

  it("título, descrição e canonical próprios", async () => {
    const m = await meta("ferramentas")
    expect(m.title).toBe("Alugar Ferramentas perto de você")
    expect(m.description).toContain("Ferramentas")
    expect(m.alternates?.canonical).toBe("/alugar/ferramentas")
    expect(mockCategoryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "ferramentas", parentId: null } }),
    )
  })

  it("slug inexistente não declara canonical", async () => {
    mockCategoryFindFirst.mockResolvedValue(null)
    const m = await meta("nao-existe")
    expect(m.alternates).toBeUndefined()
  })
})

describe("/itens?categoryId= sozinho redireciona (308)", () => {
  it("categoria sozinha → /alugar/<slug>", async () => {
    await expect(
      Explorar({ searchParams: Promise.resolve({ categoryId: "cat1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/alugar/ferramentas")
    expect(mockPermanentRedirect).toHaveBeenCalledWith("/alugar/ferramentas")
  })

  it.each([
    ["busca", { categoryId: "cat1", search: "furadeira" }],
    ["ordenação", { categoryId: "cat1", sort: "price_asc" }],
    ["página", { categoryId: "cat1", page: "2" }],
  ])("categoria + %s NÃO redireciona", async (_n, sp) => {
    // Sem banco no teste, a renderização falha adiante; o que importa é não ter redirecionado.
    await Explorar({ searchParams: Promise.resolve(sp) }).catch(() => undefined)
    expect(mockPermanentRedirect).not.toHaveBeenCalled()
  })

  it("renderizado via slug não redireciona para si mesmo", async () => {
    await Explorar({ searchParams: Promise.resolve({ categoryId: "cat1" }), viaSlug: true }).catch(() => undefined)
    expect(mockPermanentRedirect).not.toHaveBeenCalled()
  })

  it("categoria inexistente não redireciona", async () => {
    mockCategoryFindFirst.mockResolvedValue(null)
    await Explorar({ searchParams: Promise.resolve({ categoryId: "x" }) }).catch(() => undefined)
    expect(mockPermanentRedirect).not.toHaveBeenCalled()
  })
})
