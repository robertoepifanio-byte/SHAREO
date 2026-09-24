/**
 * Acumulador de visualizações via Upstash Redis.
 *
 * Em vez de um UPDATE por GET de item, usa INCR em chave Redis.
 * O cron /api/cron/flush-view-counts faz o flush periódico pro Postgres.
 *
 * Fail-open: Upstash não configurado ou erro → console.warn, nunca lança.
 * Cliente REST e namespace de chave vêm de lib/upstash.ts.
 *
 * NFR-BL2
 */

import { upstashUrl, upstashFetch, upstashKey } from "./upstash"

// Fonte única dos nomes: o cron `flush-view-counts` importa estas duas funções.
// Se os dois lados divergirem no nome, as views somem em silêncio.
export const pendingItemsSetKey = () => upstashKey("viewcount:pending-items")
export const pendingCountKey = (itemId: string) => upstashKey(`viewcount:pending:${itemId}`)

export async function incrementViewCount(itemId: string): Promise<void> {
  if (!upstashUrl()) return
  try {
    await upstashFetch(["INCR", pendingCountKey(itemId)])
    await upstashFetch(["SADD", pendingItemsSetKey(), itemId])
  } catch (e) {
    console.warn("[viewCounter] falhou:", e instanceof Error ? e.message : e)
  }
}
