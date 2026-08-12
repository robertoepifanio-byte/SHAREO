import type { APIRequestContext, APIResponse } from '@playwright/test'

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
 * `true` quando o ambiente está em modo de pré-lançamento (campanha nacional).
 *
 * Por que existe: com o gate ligado, a home vira a landing de captação e todo o
 * marketplace responde 307 (páginas) ou 503 (APIs). Os planos que exercitam
 * anunciar, reservar, favoritar ou navegar por itens passam a falhar em massa —
 * não por regressão, mas porque a funcionalidade está desligada de propósito.
 *
 * Deixar isso vermelho é pior que inútil: uma CI que está sempre vermelha para
 * de ser sinal, e a quebra de verdade passa despercebida no meio do ruído.
 * Por isso os planos afetados pulam explicitamente, com motivo visível no
 * relatório, em vez de falharem.
 *
 * A leitura é do ambiente REAL (`/api/health`), não de variável do runner: o
 * gate é inlinado no bundle em tempo de build, então só o ambiente sabe a
 * verdade — um `process.env` no CI mentiria sobre o que foi de fato deployado.
 */
const prelaunchCache = new Map<string, boolean>()

/**
 * ⚠️ `baseUrl` NÃO é opcional por capricho. Vários planos definem o próprio
 * `const BASE_URL = process.env.STAGING_URL ?? 'https://shareo-rouge...'` e
 * falam com o staging mesmo quando o Playwright aponta para localhost. Medir o
 * `/api/health` relativo (localhost) enquanto o teste chama o staging faz a
 * guarda ler o gate do ambiente ERRADO: mediria "desligado", o teste rodaria e
 * tomaria 503 do staging. Foi exatamente o que aconteceu na primeira versão
 * desta guarda. Regra: passe o MESMO BASE_URL que o spec usa nas requisições.
 */
export async function isPrelaunchOn(request: APIRequestContext, baseUrl = ''): Promise<boolean> {
  const chave = baseUrl || '(relativo)'
  const cache = prelaunchCache.get(chave)
  if (cache !== undefined) return cache
  let valor = false
  try {
    const res  = await request.get(`${baseUrl}/api/health`, { failOnStatusCode: false })
    const json = await res.json()
    valor = json?.flags?.prelaunch === true
  } catch {
    // Health fora do ar não é motivo para pular teste — se o ambiente está
    // quebrado, a suíte DEVE falhar e mostrar isso.
    valor = false
  }
  prelaunchCache.set(chave, valor)
  return valor
}

/** Motivo padronizado, para o relatório dizer por que o plano não rodou. */
export const PRELAUNCH_SKIP =
  'Modo de pré-lançamento ligado: o marketplace está fechado pelo gate (307/503). ' +
  'Plano depende de rotas de marketplace — rode com PRELAUNCH_STAGING=false.'
