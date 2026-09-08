/** @jest-environment node */
/**
 * Forma canônica da URL da vitrine.
 *
 * `/loja/<id>` e `/loja/<slug>` já serviam a MESMA vitrine, com 200 nas duas, e
 * nenhuma declarava canonical — para o buscador, conteúdo duplicado, com os
 * sinais de ranqueamento divididos entre dois endereços em vez de somados no
 * mesmo.
 *
 * 🪤 O filtro também carrega `deletedAt` e `isActive`. Conta apagada ou
 * desativada não pode ter vitrine pública, e a página e a API repetiam essas
 * condições inline — com a ordem dos ramos do `OR` invertida entre as duas,
 * que é como divergências começam.
 */
import { byStoreSlugOrId, canonicalStorePath } from "@/lib/store-url"

const ID   = "clx0a1b2c3d4e5f6g7h8"
const SLUG = "ferramentas-do-ze"

describe("byStoreSlugOrId", () => {
  it("aceita slug e id na mesma consulta", () => {
    // `arrayContaining`: `OR` é disjunção, a ordem dos ramos não tem efeito.
    // Fixá-la faria uma troca inócua reprovar o teste.
    expect(byStoreSlugOrId(SLUG).OR).toEqual(
      expect.arrayContaining([{ slug: SLUG }, { id: SLUG }]),
    )
  })

  it("nunca devolve vitrine de conta apagada ou desativada", () => {
    // Sem estas duas, ligar a busca por slug exporia vitrine de conta que a
    // própria página recusa — e o sitemap já publicava algumas dessas.
    const w = byStoreSlugOrId(ID)
    expect(w.deletedAt).toBeNull()
    expect(w.isActive).toBe(true)
  })
})

describe("canonicalStorePath", () => {
  it("prefere o slug — é a forma descritiva que o sitemap publica", () => {
    expect(canonicalStorePath({ id: ID, slug: SLUG })).toBe(`/loja/${SLUG}`)
  })

  it("cai no id quando a conta não tem slug", () => {
    // `User.slug` é gerado no cadastro, mas contas criadas por outros caminhos
    // (admin, seed antigo) podem não ter — a URL precisa existir de qualquer
    // forma.
    expect(canonicalStorePath({ id: ID, slug: null })).toBe(`/loja/${ID}`)
  })
})
