/** @jest-environment node */
/**
 * As landings /pilotos estão em desuso: no ar, mas fora do índice e do sitemap.
 *
 * 🪤 O sitemap guarda a AUSÊNCIA: voltar a listá-las reabriria 14 páginas quase idênticas
 * (74% de similaridade) para o buscador, mesmo com o `noindex` na página.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item:     { findMany: jest.fn().mockResolvedValue([]) },
    category: { findMany: jest.fn().mockResolvedValue([{ slug: "ferramentas" }]) },
    user:     { findMany: jest.fn().mockResolvedValue([]) },
  },
}))
jest.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))
jest.mock("@/components/home/FounderCaptureForm", () => ({ FounderCaptureForm: () => null }))

import sitemap from "@/app/sitemap"
import { metadata as hubMetadata } from "@/app/pilotos/page"
import { generateMetadata as cidadeMetadata } from "@/app/pilotos/[cidade]/page"

describe("/pilotos fora do índice", () => {
  it("o hub declara noindex", () => {
    expect(hubMetadata.robots).toEqual({ index: false, follow: true })
  })

  it("a landing de cidade declara noindex", async () => {
    const m = await cidadeMetadata({ params: Promise.resolve({ cidade: "sao-paulo" }) })
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it("o sitemap não lista nenhuma página de /pilotos", async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.filter((u) => u.includes("/pilotos"))).toEqual([])
  })
})
