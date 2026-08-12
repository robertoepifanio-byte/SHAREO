/**
 * Fronteira entre a campanha e o ShareO.
 *
 * A landing não tem banco, Prisma nem schema — ela conversa com o produto por
 * HTTP e só. Duas rotas, ambas já existentes e testadas do outro lado:
 *
 *   POST {SHAREO_API}/api/founders/leads   → captação
 *   GET  {SHAREO_API}/api/founders/stats   → prova social
 *
 * ⚠️ O POST sai do NAVEGADOR, não daqui do servidor, e isso é deliberado: o
 * ShareO lê `x-forwarded-for` para gravar `consentIp` (trilha de consentimento
 * LGPD) e para a chave de rate limit. Se a landing fizesse proxy server-side, o
 * ShareO registraria o IP desta função como se fosse o do usuário — corrompendo
 * a prova de consentimento e furando o rate limit. Por isso a rota do ShareO
 * precisa liberar CORS para esta origem.
 */

/** Base da API do ShareO. Sem barra no fim. */
export const SHAREO_API = (process.env.NEXT_PUBLIC_SHAREO_API_URL ?? "").replace(/\/$/, "")

/** Base do site do ShareO, para links legais (fonte única lá, não duplicada aqui). */
export const SHAREO_SITE = (process.env.NEXT_PUBLIC_SHAREO_SITE_URL ?? SHAREO_API).replace(/\/$/, "")

export const ROTAS = {
  leads: `${SHAREO_API}/api/founders/leads`,
  stats: `${SHAREO_API}/api/founders/stats`,
  termos: `${SHAREO_SITE}/termos`,
  privacidade: `${SHAREO_SITE}/privacidade`,
  politicas: `${SHAREO_SITE}/politicas`,
  pilotos: `${SHAREO_SITE}/pilotos`,
} as const

/**
 * Falha cedo e alto em build de produção se a base não foi configurada.
 *
 * Sem isto a landing sobe "funcionando": o formulário faz POST para
 * `/api/founders/leads` relativo, recebe 404 do próprio app da campanha e o
 * visitante vê "erro de conexão" — uma campanha paga captando zero lead sem
 * nenhum alarme. Ver a armadilha equivalente do NEXT_PUBLIC vazio no Vercel.
 */
if (!SHAREO_API && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SHAREO_API_URL não definida — a captação de leads não teria para onde enviar.",
  )
}
