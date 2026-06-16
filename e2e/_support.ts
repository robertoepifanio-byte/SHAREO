import type { APIResponse } from '@playwright/test'

/**
 * apiWithRetry — reexecuta uma chamada de API quando o staging free-tier
 * devolve erro transitório de carga (5xx) ou rate-limit (429).
 *
 * Contexto: os endpoints respondem normalmente em isolamento (register/itens
 * dão 201/200 via curl), mas sob a RAJADA da suíte de regressão o pool de
 * conexões do Supabase free esgota e retorna 500 INTERNAL_ERROR. Em vez de
 * falhar o gate por limite de infra, reexecutamos com backoff linear — dando
 * tempo do pool liberar conexões.
 */
export async function apiWithRetry(
  fn: () => Promise<APIResponse>,
  opts: { retries?: number; retryOn?: number[]; baseDelayMs?: number } = {},
): Promise<APIResponse> {
  const { retries = 3, retryOn = [429, 500, 502, 503, 504], baseDelayMs = 800 } = opts
  let res = await fn()
  for (let attempt = 1; attempt <= retries && retryOn.includes(res.status()); attempt++) {
    await new Promise((r) => setTimeout(r, baseDelayMs * attempt))
    res = await fn()
  }
  return res
}
