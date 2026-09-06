/**
 * URL pública da vitrine do proprietário: qual forma serve, e qual delas conta.
 *
 * 🪤 `/loja/<id>` e `/loja/<slug>` já serviam a MESMA vitrine, com 200 nas
 * duas, e nenhuma declarava canonical. Para o buscador isso é conteúdo
 * duplicado: os sinais de ranqueamento se dividem entre os dois endereços em
 * vez de somarem no mesmo.
 *
 * Diferente de `Item.slug` — que era gerado por ninguém —, `User.slug` é
 * escrito no cadastro (`app/api/auth/register/route.ts`, dentro da transação
 * que cria a conta), então a forma descritiva existe para os usuários reais e
 * vale como canônica.
 */

/**
 * Filtro que aceita slug **ou** id, e só devolve vitrine visível.
 *
 * As três condições andam juntas de propósito: conta apagada ou desativada não
 * pode ter vitrine pública, e separar isso do filtro de identidade só criaria
 * a chance de alguém esquecer uma delas numa consulta nova. Era o que já
 * acontecia — `app/loja/[slug]/page.tsx` e `app/api/loja/[slug]/route.ts`
 * repetiam o mesmo `OR` inline, com a ordem dos ramos invertida entre eles.
 */
export function byStoreSlugOrId(slugOrId: string) {
  return {
    OR:        [{ slug: slugOrId }, { id: slugOrId }],
    deletedAt: null,
    isActive:  true,
  }
}

/**
 * Caminho canônico da vitrine: o slug quando existe, o id como reserva.
 *
 * É a forma que deve aparecer em `<link rel="canonical">`, no `og:url` e no
 * sitemap. O link interno em `/perfil` pode continuar com `slug ?? id` — está
 * atrás de sessão, não de busca.
 *
 * 🪤 `slug` é obrigatório no tipo (e não `slug?`) para que esquecer
 * `slug: true` num `select` novo vire erro de compilação, em vez de publicar a
 * URL de id em silêncio.
 */
export function canonicalStorePath(user: { id: string; slug: string | null }): string {
  return `/loja/${user.slug ?? user.id}`
}
