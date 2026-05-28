import * as SecureStore from "expo-secure-store"

// Troca pela URL do seu Vercel em produção
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://shareo-rouge.vercel.app"

const TOKENS_KEY = "shareo_tokens"

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
      if (!retry.ok) throw new Error(`API ${retry.status}`)
      return retry.json()
    }
    // Refresh falhou — limpa tokens
    await clearTokens()
    throw new Error("SESSION_EXPIRED")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `API ${res.status}`)
  }

  return res.json()
}
