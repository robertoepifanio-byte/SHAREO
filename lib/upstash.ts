/**
 * Cliente mínimo do Upstash Redis via REST — Edge-compatível (não usa o SDK
 * @upstash/redis, que depende de jose/CompressionStream, Node.js only).
 *
 * Extraído porque o mesmo trio `upstashUrl`/`upstashToken`/`upstashFetch` já
 * vivia repetido em `lib/viewCounter.ts` e `lib/redis-admin-blocklist.ts` — um
 * terceiro contador (`lib/founderFunnel.ts`) reimplementá-lo de novo seria a
 * mesma duplicação pela terceira vez. Os dois arquivos antigos não foram
 * tocados (fora do escopo desta mudança); código novo usa este módulo.
 */

export function upstashUrl(): string | null {
  return process.env.UPSTASH_REDIS_REST_URL ?? null
}

export function upstashToken(): string | null {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? null
}

export async function upstashFetch(command: string[]): Promise<unknown> {
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
