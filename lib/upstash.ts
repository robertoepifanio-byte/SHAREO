/**
 * Cliente mínimo do Upstash Redis via REST — Edge-compatível (não usa o SDK
 * @upstash/redis, que depende de jose/CompressionStream, Node.js only).
 *
 * Extraído porque o mesmo trio `upstashUrl`/`upstashToken`/`upstashFetch` vivia
 * repetido em `lib/viewCounter.ts`, no cron `flush-view-counts` e em
 * `lib/redis-admin-blocklist.ts`. Os dois primeiros já usam este módulo; a cópia
 * da blocklist segue como está (fora do escopo, tem teste próprio).
 *
 * Também expõe `upstashStatus` (a sonda do /api/health) e `upstashKey`.
 */

export function upstashUrl(): string | null {
  return process.env.UPSTASH_REDIS_REST_URL ?? null
}

export function upstashToken(): string | null {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? null
}

export async function upstashFetch(command: string[], timeoutMs?: number): Promise<unknown> {
  const url   = upstashUrl()
  const token = upstashToken()
  if (!url || !token) return null

  const res = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(command),
    signal:  timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
  })

  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  const json = await res.json() as { result: unknown }
  return json.result
}

/**
 * Namespace das chaves que citam dados de UM banco: o ref do projeto Supabase
 * (primeiro rótulo de NEXT_PUBLIC_SUPABASE_URL). Cai em "local" quando a URL está
 * ausente, vazia ou não é `*.supabase.co`; nesse caso os ambientes que também
 * caírem em "local" voltam a dividir chaves, sem erro. O `flags.upstashNs` do
 * /api/health mostra o valor que o artefato deployado resolveu.
 *
 * Existe porque staging e produção dividem o mesmo Redis (plano free, decisão do
 * fundador em 24/09/2026, até o uso chegar a 90% da cota; a saída é trocar as
 * duas variáveis UPSTASH_* do `shareo-prod`, sem mudar código). Sem o namespace,
 * o contador de views (`viewcount:pending:<itemId>`) era lido e apagado (GETDEL)
 * pelo cron dos DOIS ambientes: o de um destruía as views do outro e o `update`
 * falhava em item que não existe no banco dele. O funil da campanha e o limite
 * por IP somavam tentativas dos dois.
 *
 * Pelo projeto Supabase, e não pelo domínio: a chave cita ids daquele banco, e o
 * domínio pode mudar sem migrar dado.
 *
 * Globais de propósito: `session:epoch:<userId>` (o cuid é único ENTRE bancos) e
 * `cnpj:lookup:<cnpj>` (dado da Receita, o mesmo nos dois). Chave nova nasce
 * global se não passar por `upstashKey`: decida e anote.
 */
export function upstashNamespace(): string {
  const ref = /^https?:\/\/([a-z0-9]+)\.supabase\.co/i.exec((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim())
  return ref ? ref[1].toLowerCase() : "local"
}

export function upstashKey(chave: string): string {
  return `${upstashNamespace()}:${chave}`
}

type UpstashStatus = "ok" | "sem-chave" | "erro-rede" | "erro-resposta" | `erro-${number}`

const STATUS_TTL_MS     = 5 * 60_000
const STATUS_TIMEOUT_MS = 2_000
let statusEmCache: { valor: Promise<UpstashStatus>; expiraEm: number } | null = null

/** Nunca rejeita: qualquer falha vira um valor do vocabulário. */
async function pingar(): Promise<UpstashStatus> {
  try {
    return (await upstashFetch(["PING"], STATUS_TIMEOUT_MS)) === "PONG" ? "ok" : "erro-resposta"
  } catch (e) {
    const http = e instanceof Error ? /^Upstash (\d{3})$/.exec(e.message) : null
    return http ? `erro-${Number(http[1])}` : "erro-rede"
  }
}

/**
 * Diz se o Upstash responde a ESTE runtime — alimenta `flags.upstash` do /api/health.
 *
 * O rate limit degrada sem log quando o Redis falha (`checkRateLimit` cai para
 * memória por instância) e nem tenta sem URL/token; `isSessionStale` falha aberta
 * e só emite warn. Em 24/09/2026 a produção tinha as duas variáveis no painel e
 * nenhum comando chegava ao banco, sem sinal por fora.
 *
 * O status HTTP entra no valor (`erro-401` = token recusado): vocabulário fechado
 * demais esconde a causa. Limite: o PING prova URL, token e rede, não permissão
 * de escrita.
 *
 * Cota: o health é público e o plano free tem teto de comandos por mês. Guarda-se
 * a PROMESSA em voo (não o valor) por 5 min por instância, então nem requisições
 * simultâneas nem um monitor frequente viram rajada de comandos.
 */
export function upstashStatus(): Promise<UpstashStatus> {
  if (!upstashUrl() || !upstashToken()) return Promise.resolve("sem-chave")

  const agora = Date.now()
  if (!statusEmCache || statusEmCache.expiraEm <= agora) {
    statusEmCache = { valor: pingar(), expiraEm: agora + STATUS_TTL_MS }
  }
  return statusEmCache.valor
}
