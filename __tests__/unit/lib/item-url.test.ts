/** @jest-environment node */
/**
 * Forma canônica da URL do anúncio.
 *
 * `Item.slug` estava morto dos DOIS lados: a página consultava só por `id`,
 * então `/itens/<slug>` devolvia 404 — e nenhuma rota de criação escrevia o
 * campo, que era `null` em 100% dos anúncios reais. `buildSlug` existia em
 * `utils/geo.ts`, com 9 testes, chamado apenas pelo próprio teste. O schema
 * documentava "SEO URL" para uma coluna vazia que ninguém sabia ler.
 *
 * Por isso o teste que mais importa aqui é o da VOLTA COMPLETA: o slug que a
 * criação grava tem que ser exatamente o que a consulta encontra e o que o
 * canonical publica. Consertar só uma das pontas devolve a mesma promessa
 * vazia com mais código.
 */
import { byIdOrSlug, canonicalItemPath } from "@/lib/item-url"
import { buildSlug } from "@/utils/geo"

const ID = "clx0a1b2c3d4e5f6g7h8"

describe("volta completa: gerar → encontrar → publicar", () => {
  it("o slug gravado na criação é o que a consulta acha e o canonical publica", () => {
    const slug = buildSlug("Furadeira Bosch 500W", "Recife", "PE", ID)

    // 1. a consulta da página encontra por ele
    expect(byIdOrSlug(slug).OR).toContainEqual({ slug })
    // 2. e o canonical publica exatamente o mesmo
    expect(canonicalItemPath({ id: ID, slug })).toBe(`/itens/${slug}`)
  })

  it("o slug carrega o id, então dois anúncios iguais não colidem", () => {
    // É o que dispensa tratamento de colisão na criação: mesmo título, mesma
    // cidade, ids diferentes.
    const a = buildSlug("Furadeira", "Recife", "PE", "id-a")
    const b = buildSlug("Furadeira", "Recife", "PE", "id-b")
    expect(a).not.toBe(b)
  })
})

describe("byIdOrSlug", () => {
  it("aceita as duas formas na mesma consulta", () => {
    expect(byIdOrSlug(ID).OR).toEqual([{ id: ID }, { slug: ID }])
  })

  it("não devolve anúncio apagado, seja por id ou por slug", () => {
    // O soft-delete é a fonte de verdade da exclusão: sem isto, ligar o slug
    // ressuscitaria anúncios removidos numa URL nova.
    expect(byIdOrSlug(ID).deletedAt).toBeNull()
  })
})

describe("canonicalItemPath", () => {
  it("prefere o slug — é a forma descritiva que o buscador indexa", () => {
    const slug = "furadeira-em-recife-pe-" + ID
    expect(canonicalItemPath({ id: ID, slug })).toBe(`/itens/${slug}`)
  })

  it("cai no id quando o anúncio não tem slug", () => {
    // Anúncios criados antes desta mudança, e os que não têm cidade/estado,
    // seguem com slug null — a URL precisa existir de qualquer forma, senão o
    // sitemap emite um caminho quebrado.
    expect(canonicalItemPath({ id: ID, slug: null })).toBe(`/itens/${ID}`)
  })
})
