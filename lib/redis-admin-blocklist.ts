/**
 * Admin blocklist via Upstash REST API — Edge Runtime compatível.
 *
 * Usa fetch direto à API REST do Upstash em vez do SDK @upstash/redis,
 * que depende de jose/CompressionStream (Node.js only, incompatível com Edge).
 *
 * Ao desativar ou rebaixar um admin, seu userId é adicionado com TTL = maxAge
 * do JWT (1 dia). O middleware checa a cada request em rotas admin.
 *
 * Fallback gracioso: se Upstash estiver indisponível, retorna false (acesso
 * permitido) — o JWT expira normalmente em 1 dia.
 */

const JWT_MAX_AGE_SECONDS = 24 * 60 * 60

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
