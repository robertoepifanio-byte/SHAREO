/**
 * Admin blocklist via Upstash REST API — Edge Runtime compatível.
 *
 * Usa fetch direto à API REST do Upstash em vez do SDK @upstash/redis,
 * que depende de jose/CompressionStream (Node.js only, incompatível com Edge).
 *
 * Ao desativar ou rebaixar um admin, seu userId é adicionado com TTL = maxAge
 * do JWT. O middleware checa a cada request em rotas admin.
 *
 * Também expõe a invalidação de sessão por epoch (SEC-CRIT-04): na troca de
 * senha/e-mail grava-se um timestamp; tokens com `loginAt` anterior a ele são
 * rejeitados no middleware até expirarem naturalmente.
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

function redisKey(userId: string) {
  return `admin:blocked:${encodeURIComponent(userId)}`
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

/** Bloqueia JWT do admin imediatamente (desativação ou rebaixamento de role). */
export async function blockAdminToken(userId: string): Promise<void> {
  if (!upstashUrl()) return
  try {
    await upstashFetch(["SETEX", redisKey(userId), String(JWT_MAX_AGE_SECONDS), "1"])
  } catch (e) {
    console.warn("[blocklist] blockAdminToken falhou:", e instanceof Error ? e.message : e)
  }
}

/** Retorna true se o userId está na blocklist (acesso deve ser negado). */
export async function isAdminBlocked(userId: string): Promise<boolean> {
  if (!upstashUrl()) return false
  try {
    const result = await upstashFetch(["GET", redisKey(userId)])
    return result === "1"
  } catch (e) {
    console.warn("[blocklist] isAdminBlocked falhou:", e instanceof Error ? e.message : e)
    return false
  }
}

/** Remove da blocklist (reativação de admin). */
export async function unblockAdminToken(userId: string): Promise<void> {
  if (!upstashUrl()) return
  try {
    await upstashFetch(["DEL", redisKey(userId)])
  } catch (e) {
    console.warn("[blocklist] unblockAdminToken falhou:", e instanceof Error ? e.message : e)
  }
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
