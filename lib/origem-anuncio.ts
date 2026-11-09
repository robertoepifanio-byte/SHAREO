// De onde o usuário abriu um anúncio (listagem com filtros e página, favoritos,
// dashboard), para o "← Voltar" da página do anúncio. Fica em sessionStorage em vez
// de `?back=` na URL: o parâmetro criava uma 2ª URL por anúncio para o buscador
// rastrear, e `document.referrer` não muda em navegação client-side do Next.
const CHAVE = "shareo:origem-anuncio"

export function guardarOrigemDoAnuncio(): void {
  try {
    sessionStorage.setItem(CHAVE, window.location.pathname + window.location.search)
  } catch {
    // Storage bloqueado (aba privada, política do navegador): o Voltar cai em /itens.
  }
}

/** Caminho interno guardado ou `null`. Só aceita caminho relativo ao próprio site. */
export function lerOrigemDoAnuncio(): string | null {
  try {
    const v = sessionStorage.getItem(CHAVE)
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null
  } catch {
    return null
  }
}
