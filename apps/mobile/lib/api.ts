import * as SecureStore from "expo-secure-store"

// URL padrão aponta para o domínio público do staging (Deployment Protection bloqueia *.vercel.app com 401).
// Sobrescrever com EXPO_PUBLIC_API_URL em builds de produção quando o domínio definitivo existir.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://staging.shareo.com.br"

const TOKENS_KEY = "shareo_tokens"

/**
 * Erro de API que preserva `status` e `error.code` do corpo.
 *
 * Antes, `apiFetch` jogava fora tudo menos a mensagem, e as telas recorriam a
 * sniffing de string para decidir o que fazer (ex.: `msg.includes("404")` em
 * app/reservas/[id].tsx). Isso quebra ao menor ajuste de texto no backend.
 *
 * `message` continua exatamente igual ao de antes, então o sniffing existente
 * segue funcionando — esta mudança só ACRESCENTA informação.
 *
 * Campos atribuídos no corpo do construtor de propósito: `declare` em campo de
 * classe passa no tsc e quebra no bundle do Metro (babel-preset-expo).
 */
export class ApiError extends Error {
  status: number
  code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

/**
 * `true` quando a API recusou por causa do gate de pré-lançamento.
 *
 * Checa a propriedade em vez de `instanceof ApiError`: com target ES5 o
 * `instanceof` de classe que estende Error é traiçoeiro, e o erro pode ter
 * cruzado uma fronteira de serialização (React Query, boundary) no caminho.
 */
export function isPrelaunchError(e: unknown): boolean {
  return hasErrorCode(e, "PRELAUNCH")
}

/** `true` quando o erro carrega `error.code` igual ao esperado. Ver nota acima
 *  sobre por que a checagem é por propriedade, e não por `instanceof`. */
export function hasErrorCode(e: unknown, code: string): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === code
}

/** `true` quando a API respondeu com o status HTTP informado. */
export function hasErrorStatus(e: unknown, status: number): boolean {
  return typeof e === "object" && e !== null && (e as { status?: unknown }).status === status
}

interface Tokens {
  accessToken:  string
  refreshToken: string
}

export async function getTokens(): Promise<Tokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function saveTokens(tokens: Tokens) {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens))
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKENS_KEY)
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const tokens = await getTokens()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  })

  // Token expirado — tenta refresh
  if (res.status === 401 && tokens?.refreshToken) {
    const refreshRes = await fetch(`${API_URL}/api/auth/mobile/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
    if (refreshRes.ok) {
      const { data } = await refreshRes.json()
      await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      // Retry com novo token
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.accessToken}`,
          ...(options.headers as Record<string, string> ?? {}),
        },
      })
      if (!retry.ok) {
        const retryBody = await retry.json().catch(() => ({}))
        throw new ApiError(
          retryBody?.error?.message ?? `API ${retry.status}`,
          retry.status,
          retryBody?.error?.code ?? null,
        )
      }
      return retry.json()
    }
    // Refresh falhou — limpa tokens
    await clearTokens()
    throw new Error("SESSION_EXPIRED")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      body?.error?.message ?? `API ${res.status}`,
      res.status,
      body?.error?.code ?? null,
    )
  }

  return res.json()
}
