// APENAS imports de tipo: este módulo precisa carregar sob o jest, que não
// consegue instanciar o runtime do Playwright. Helper de UI vai em `_ui.ts`.
import type { APIResponse } from '@playwright/test'

export interface PlanStepLike {
  name:   string
  status: 'passed' | 'failed' | 'skipped'
  error?: string
}

/**
 * assertNoFailedSteps — fecha o veredito de um plano E2E COM sinal para o Playwright.
 *
 * Os specs `e2e-*-plan.spec.ts` rodam steps por um runner próprio: step `critical`
 * aborta o plano (`abortError`), step `high`/`medium` apenas registra a falha e o
 * runner segue — que é o comportamento certo, porque um step quebrado não deve
 * esconder o diagnóstico dos seguintes.
 *
 * O defeito era o final: o veredito `PARCIAL` ficava só dentro do JSON de
 * relatório e NADA era lançado, então o Playwright dava o teste como `passed`.
 * Regressão real em compartilhamento, /admin, XSS e a11y passava verde no gate —
 * o mesmo padrão do job de CI que herdava `skipped` e nunca rodava: ausência de
 * sinal se passando por aprovação.
 *
 * Continuar rodando todos os steps é intencional; terminar sem falhar não era.
 * Chame ISTO no lugar do `if (abortError) throw abortError` final.
 */
export function assertNoFailedSteps(
  plano:      string,
  results:    readonly PlanStepLike[],
  abortError?: Error,
): void {
  // O erro de step crítico tem stack e mensagem originais — preserva o diagnóstico.
  if (abortError) throw abortError

  const falhos = results.filter((r) => r.status === 'failed')
  if (falhos.length === 0) return

  const detalhe = falhos
    .map((r) => `  ✗ ${r.name}\n      ${(r.error ?? 'sem mensagem de erro').split('\n')[0]}`)
    .join('\n')

  throw new Error(
    `${plano} — veredito PARCIAL: ${falhos.length} de ${results.length} steps falharam.\n${detalhe}`,
  )
}

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
  const { retries = 4, retryOn = [429, 500, 502, 503, 504], baseDelayMs = 1200 } = opts
  let res = await fn()
  for (let attempt = 1; attempt <= retries && retryOn.includes(res.status()); attempt++) {
    await new Promise((r) => setTimeout(r, baseDelayMs * attempt))
    res = await fn()
  }
  return res
}