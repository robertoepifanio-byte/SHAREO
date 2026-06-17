/**
 * Invalidação de sessão por epoch (SEC-CRIT-04) via Upstash REST API — Edge-compatível.
 *
 * Usa fetch direto à API REST do Upstash em vez do SDK @upstash/redis,
 * que depende de jose/CompressionStream (Node.js only, incompatível com Edge).
 *
 * Na troca de senha/e-mail OU no rebaixamento/desativação de admin, grava-se um
 * timestamp (epoch); tokens com `loginAt` anterior a ele são rejeitados no
 * middleware até expirarem. Isso mata as sessões ANTIGAS sem bloquear logins
 * NOVOS — o login reflete o estado atual do usuário, e o `authorize()` já barra
 * contas inativas/removidas. (Substitui a blocklist por-userId, que travava até
 * logins novos de um admin ainda válido.)
 *
 * Fallback gracioso: se Upstash estiver indisponível, retorna false (acesso
 * permitido) — o JWT expira normalmente ao fim do maxAge.
 */

// Deve ser >= session.maxAge (lib/auth.ts) para o bloqueio/epoch cobrir todo o
// tempo de vida possível do token. Hoje maxAge = 30 dias.
const JWT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function upstashUrl(): string | null {
  return process.env.UPSTASH_REDIS_REST_URL ?? null
}

function upstashToken(): string | null {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? null
}

async function upstashFetch(command: string[]): Promise<unknown> {
  const url   = upstashUrl()
  const token = upstashToken()
  if (!url || !token) return null

  const res = await fetch(`${url}`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(command),
  })

  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  const json = await res.json() as { result: unknown }
  return json.result
}

// ─── Invalidação de sessão por epoch (SEC-CRIT-04) ──────────────────────────

function epochKey(userId: string) {
  return `session:epoch:${encodeURIComponent(userId)}`
}

/**
 * Invalida todas as sessões do usuário emitidas ANTES de agora — chamado na
 * troca de senha/e-mail (e base para um futuro "sair de todos os dispositivos").
 * Grava o timestamp atual (s) com TTL = maxAge; tokens com `loginAt` < epoch
 * são rejeitados no middleware.
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  if (!upstashUrl()) return
  try {
    const nowSec = Math.floor(Date.now() / 1000)
    await upstashFetch(["SETEX", epochKey(userId), String(JWT_MAX_AGE_SECONDS), String(nowSec)])
  } catch (e) {
    console.warn("[blocklist] invalidateUserSessions falhou:", e instanceof Error ? e.message : e)
  }
}

/**
 * true se o token (pelo claim `loginAt`, fixado no login e preservado nos
 * refreshes) foi emitido antes da última invalidação de sessão do usuário.
 * Fail-open: Redis indisponível ou `loginAt` ausente (tokens antigos) ⇒ false.
 */
export async function isSessionStale(userId: string, loginAt: number | undefined): Promise<boolean> {
  if (!upstashUrl() || !loginAt) return false
  try {
    const result = await upstashFetch(["GET", epochKey(userId)])
    if (result == null) return false
    const epoch = Number(result)
    return Number.isFinite(epoch) && loginAt < epoch
  } catch (e) {
    console.warn("[blocklist] isSessionStale falhou:", e instanceof Error ? e.message : e)
    return false
  }
}
