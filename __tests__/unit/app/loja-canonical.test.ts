/** @jest-environment node */
/**
 * A vitrine declara qual das duas URLs conta.
 *
 * `/loja/<id>` e `/loja/<slug>` servem a MESMA página, com 200 nas duas.
 * Enquanto nenhuma declarava canonical, o buscador via conteúdo duplicado e
 * dividia os sinais de ranqueamento entre os dois endereços.
 *
 * 🪤 O teste ataca por onde a pessoa CHEGA pelo id — é aí que o canonical tem
 * trabalho a fazer. Testar só a chegada pelo slug passaria mesmo sem canonical
 * nenhum, porque a URL visitada já seria a canônica.
 */

const mockUserFindFirst = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user:   { findFirst: (...a: unknown[]) => mockUserFindFirst(...a) },
    item:   { findMany: jest.fn() },
    review: { aggregate: jest.fn() },
  },
}))

// `generateMetadata` não usa `AppHeader` — mas o módulo da página o importa, e
// a cadeia `AppHeader → MobileMenu → next-auth/react` é ESM que o jest não
// transforma aqui. Mockar a página inteira seria testar o dublê; mockar só o
// cabeçalho corta a cadeia e deixa `generateMetadata` rodar de verdade.
//
// 🪤 A causa está em `jest.config.ts`: `transformIgnorePatterns` lista
// `next-auth`, mas o caminho real no layout do pnpm é
// `node_modules/.pnpm/next-auth@…/node_modules/next-auth`, e o lookahead não
// casa. Enquanto isso não mudar, qualquer import novo nesta página que alcance
// ESM quebra este arquivo com um SyntaxError sem relação com canonical.

jest.mock("@/components/layout/AppHeader", () => ({ AppHeader: () => null }))

import { generateMetadata } from "@/app/loja/[slug]/page"

const OWNER = {
  id:         "clx0a1b2c3d4e5f6g7h8",
  name:       "Ferramentas do Zé",
  slug:       "ferramentas-do-ze",
  bio:        "Alugamos ferramentas.",
  avatarUrl:  null,
  city:       "Recife",
  state:      "PE",
  userType:   "PJ",
  isVerified: true,
  createdAt:  new Date("2026-01-15"),
  _count:     { items: 3, reviewsReceived: 2 },
}

const metaFor = (slugOrId: string) =>
  generateMetadata({ params: Promise.resolve({ slug: slugOrId }) })

beforeEach(() => {
  jest.clearAllMocks()
  mockUserFindFirst.mockResolvedValue(OWNER)
})

describe("vitrine — URL canônica", () => {
  it("chegando pelo ID, aponta o canonical para o slug", async () => {
    const meta = await metaFor(OWNER.id)

    expect(meta.alternates?.canonical).toBe(`/loja/${OWNER.slug}`)
  })

  it("og:url acompanha o canonical — o Next não deriva um do outro", async () => {
    const meta = await metaFor(OWNER.id)

    // Sem isto, compartilhar no WhatsApp fixaria no preview a URL visitada.
    expect(meta.openGraph?.url).toBe(`/loja/${OWNER.slug}`)
  })

  // O fallback para o id e o filtro de visibilidade são contrato de
  // `lib/store-url.ts` e estão cobertos em `store-url.test.ts`. Repeti-los aqui
  // pelo caminho caro (import da página + mock) só faria uma mudança no helper
  // reprovar dois arquivos em vez de um. O que este arquivo prova é a FIAÇÃO.

  it("vitrine inexistente não inventa canonical", async () => {
    mockUserFindFirst.mockResolvedValue(null)

    const meta = await metaFor("nao-existe")

    expect(meta.title).toBe("Vitrine não encontrada")
    expect(meta.alternates?.canonical).toBeUndefined()
  })
})
