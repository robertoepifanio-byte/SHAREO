/**
 * Admin blocklist no Redis (Upstash).
 *
 * Ao desativar ou rebaixar um admin, seu userId é adicionado ao set com TTL
 * igual ao maxAge do JWT (1 dia). O middleware checa o set a cada request
 * em rotas admin — revogação ocorre em <1s sem query SQL.
 *
 * Fallback gracioso: se Redis estiver indisponível, o JWT permanece válido
 * até expirar (1 dia). Risco residual aceito pelo produto (vide análise ADR).
 */

import { Redis } from "@upstash/redis"

const JWT_MAX_AGE_SECONDS = 24 * 60 * 60 // 1 dia — alinhado com session.maxAge

function getRedis(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) return null
  return Redis.fromEnv()
}

function key(userId: string) {
  return `admin:blocked:${userId}`
}

/** Bloqueia JWT do admin imediatamente (desativação ou rebaixamento de role). */
export async function blockAdminToken(userId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.setex(key(userId), JWT_MAX_AGE_SECONDS, "1")
  } catch (e) {
    console.warn("[blocklist] blockAdminToken falhou:", e instanceof Error ? e.message : e)
  }
}

/** Retorna true se o userId está na blocklist (acesso deve ser negado). */
export async function isAdminBlocked(userId: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const val = await redis.get(key(userId))
    return val === "1"
  } catch (e) {
    console.warn("[blocklist] isAdminBlocked falhou:", e instanceof Error ? e.message : e)
    return false // falha aberta — preferível a bloquear admins legítimos
  }
}

/** Remove da blocklist (reativação de admin). */
export async function unblockAdminToken(userId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(key(userId))
  } catch (e) {
    console.warn("[blocklist] unblockAdminToken falhou:", e instanceof Error ? e.message : e)
  }
}
