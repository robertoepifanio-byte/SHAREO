/**
 * Identidade pública da landing: onde ela vive e se pode ser indexada.
 *
 * `robots.ts`, `sitemap.ts` e o `metadataBase` do layout precisam concordar
 * sobre as duas coisas — o robots ANUNCIA a URL do sitemap, e o sitemap a
 * responde. Calculadas em cada arquivo, elas divergem em silêncio: bastaria um
 * sair do noindex antes do outro para publicar um sitemap proibido pelo robots.
 *
 * Espelha `lib/seo-flags.ts` do app principal, mesma decisão pelo mesmo motivo.
 *
 * ⚠️ No Vercel, NUNCA marcar `NEXT_PUBLIC_NOINDEX` como "Sensitive". Aqui o
 * build roda nativamente na Vercel (onde Sensitive funciona), mas a variável é
 * lida em build time e o custo de errar é a landing paga fora do índice.
 */
export const BASE_URL = process.env.NEXT_PUBLIC_CAMPANHA_URL ?? "http://localhost:3007"

export const NOINDEX_ENABLED = process.env.NEXT_PUBLIC_NOINDEX === "true"
