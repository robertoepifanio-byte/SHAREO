/**
 * URL pública do anúncio: qual forma serve, e qual delas conta.
 *
 * 🪤 `Item.slug` estava morto dos DOIS lados: `app/itens/[id]/page.tsx`
 * consultava `where: { id }`, então `/itens/<slug>` devolvia 404 — e nenhuma
 * rota de criação escrevia o campo, então ele era `null` em 100% dos anúncios
 * reais. `utils/geo.ts` tinha um `buildSlug` implementado e com 9 testes,
 * chamado apenas pelo próprio teste. O schema documentava "SEO URL" para uma
 * coluna vazia que ninguém sabia ler.
 *
 * Consertar só a leitura teria sido a mesma promessa vazia com mais código:
 * `canonicalItemPath` cairia no id para todo anúncio e o slug seguiria morto.
 * Por isso `app/api/items` passou a gerar o slug na criação.
 *
 * Agora as duas formas servem o anúncio, e o `canonical` diz ao buscador qual
 * das duas conta — sem isso, servir o mesmo conteúdo em dois endereços é
 * conteúdo duplicado, que divide os sinais de ranqueamento em vez de somá-los.
 */

/**
 * Filtro que aceita ID **ou** slug.
 *
 * Não há ambiguidade a resolver: `id` é cuid e `slug` é kebab-case terminando
 * em cidade/UF, então um valor nunca casa os dois. Se um dia casasse, o `OR`
 * devolveria o primeiro — e o `@unique` de cada coluna impede o empate.
 */
export function byIdOrSlug(idOrSlug: string) {
  return { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null }
}

/**
 * Caminho canônico do anúncio: o slug quando existe, o id como reserva.
 *
 * É a forma que deve aparecer em `<link rel="canonical">`, no `og:url`, no
 * sitemap e no JSON-LD. Os links internos do app podem continuar usando o id —
 * eles estão atrás de navegação, não de busca, e o canonical já diz qual
 * endereço conta.
 *
 * 🪤 `slug` é obrigatório no tipo (e não `slug?`) de propósito: assim esquecer
 * `slug: true` num `select` novo vira erro de compilação, em vez de devolver a
 * URL de id em silêncio — que é exatamente a regressão que este helper existe
 * para impedir.
 */
export function canonicalItemPath(item: { id: string; slug: string | null }): string {
  return `/itens/${item.slug ?? item.id}`
}
