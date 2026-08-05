/**
 * Acumulador de visualizações via Upstash Redis.
 *
 * Em vez de um UPDATE por GET de item, usa INCR em chave Redis.
 * O cron /api/cron/flush-view-counts faz o flush periódico pro Postgres.
 *
 * Fail-open: Upstash não configurado ou erro → console.warn, nunca lança.
 * Segue o padrão de upstashFetch de lib/redis-admin-blocklist.ts.
 *
 * NFR-BL2
 */

const PENDING_ITEMS_SET = "viewcount:pending-items"

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

  const res = await fetch(url, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(command),
  })

  if (!res.ok) throw new Error(`Upstash ${res.status}`)
  const json = await res.json() as { result: unknown }
  return json.result
}

export async function incrementViewCount(itemId: string): Promise<void> {
  if (!upstashUrl()) return
  try {
    await upstashFetch(["INCR", `viewcount:pending:${itemId}`])
    await upstashFetch(["SADD", PENDING_ITEMS_SET, itemId])
  } catch (e) {
    console.warn("[viewCounter] falhou:", e instanceof Error ? e.message : e)
  }
}
