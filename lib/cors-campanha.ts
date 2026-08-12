/**
 * CORS para as rotas que a landing da campanha consome de outro domínio.
 *
 * A landing vive num app e num deploy próprios (apps/campanha) e faz POST de
 * captação direto do NAVEGADOR para cá. Isso é deliberado: o `consentIp` da
 * trilha LGPD e a chave de rate limit saem do `x-forwarded-for`, então um proxy
 * server-side do lado da campanha gravaria o IP do servidor dela como se fosse
 * o do usuário — corrompendo a prova de consentimento e furando o limite.
 *
 * ⚠️ Allowlist explícita, NUNCA `*`. Estas rotas gravam dado pessoal; um
 * curinga deixaria qualquer site do mundo postar leads em nome do ShareO e
 * consumir a cota do Resend.
 *
 * Configuração: `CAMPANHA_ORIGINS`, origens separadas por vírgula, com esquema
 * e sem barra final. Ex.:
 *   CAMPANHA_ORIGINS="https://campanha.shareo.com.br,https://shareo.com.br"
 *
 * Vazia = nenhuma origem externa liberada (comportamento anterior à campanha).
 */
const ORIGENS = (process.env.CAMPANHA_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean)

export function origemPermitida(origin: string | null): string | null {
  if (!origin) return null
  return ORIGENS.includes(origin.replace(/\/$/, "")) ? origin : null
}

/**
 * Cabeçalhos de CORS para uma origem já validada.
 *
 * `Vary: Origin` é obrigatório: sem ele, um CDN pode servir a resposta com o
 * `Access-Control-Allow-Origin` de OUTRA origem para o próximo visitante.
 */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
    Vary:                           "Origin",
  }
}

/** Aplica CORS numa resposta quando a origem está na allowlist. */
export function comCors<T extends Response>(res: T, origin: string | null): T {
  const permitida = origemPermitida(origin)
  if (!permitida) return res
  for (const [k, v] of Object.entries(corsHeaders(permitida))) res.headers.set(k, v)
  return res
}

/** Resposta ao preflight. 204 quando permitido, 403 quando a origem não consta. */
export function respostaPreflight(origin: string | null): Response {
  const permitida = origemPermitida(origin)
  if (!permitida) return new Response(null, { status: 403 })
  return new Response(null, { status: 204, headers: corsHeaders(permitida) })
}
