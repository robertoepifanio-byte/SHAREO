// APENAS imports de tipo: este módulo precisa carregar sob o jest, que não
// consegue instanciar o runtime do Playwright. Helper de UI vai em `_ui.ts`.
import type { APIResponse, APIRequestContext } from '@playwright/test'

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
/**
 * PNG 1×1 válido — precisa ser um PNG de verdade porque
 * `/api/bookings/[id]/photos` confere os magic bytes do arquivo, não só o MIME.
 */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * markBookingPaidForTest — marca uma reserva como PAGA via rota de apoio E2E.
 *
 * Necessário porque o guard `PAYMENT_REQUIRED` em `mark_active` exige
 * `paymentStatus === "PAID"` antes de aceitar a retirada do item. Os specs
 * E2E não passam pelo checkout real (Stripe), então chamam esta rota para
 * simular o estado pós-pagamento sem regenerar o pickupToken.
 *
 * A rota `/api/test/mark-booking-paid` é protegida por `x-e2e-token`
 * (injetado globalmente pelo `playwright.config.ts` via `extraHTTPHeaders`)
 * e desabilitada em produção via `E2E_BYPASS_DISABLED=true`.
 */
export async function markBookingPaidForTest(
  request: APIRequestContext,
  bookingId: string,
  /** Alguns specs montam URL absoluta a partir de BASE — passe-a aqui. */
  base = '',
): Promise<void> {
  const res = await request.post(`${base}/api/test/mark-booking-paid`, {
    data: { bookingId },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '(sem corpo)')
    throw new Error(`markBookingPaidForTest falhou: ${res.status()} — ${body}`)
  }
}

/**
 * enviarFotoDevolucao — sobe a foto de CHECKOUT exigida antes de `mark_returned`.
 *
 * Desde 2026-08-23 a API recusa `mark_returned` com 422 RETURN_PHOTO_REQUIRED
 * quando a reserva não tem nenhuma foto de devolução (decisão do fundador: sem
 * foto, uma disputa aberta depois da devolução não tem como ser arbitrada).
 * Os specs que só querem ATRAVESSAR o ciclo até RETURNED chamam isto antes.
 *
 * Precisa ser o LOCATÁRIO (ou o proprietário) — a rota exige participante.
 */
export async function enviarFotoDevolucao(
  request:   APIRequestContext,
  bookingId: string,
  /** Alguns specs montam URL absoluta a partir de BASE — passe-a aqui. */
  base = '',
): Promise<APIResponse> {
  return request.post(`${base}/api/bookings/${bookingId}/photos`, {
    multipart: {
      bookingId,
      phase: 'CHECKOUT',
      file:  { name: 'devolucao.png', mimeType: 'image/png', buffer: PNG_1X1 },
    },
  })
}
