import { createBrowserClient } from "@supabase/ssr"

// Singleton — reutiliza a mesma conexão WebSocket entre re-renders
let _client: ReturnType<typeof createBrowserClient> | null = null

/**
 * Retorna o cliente Supabase para uso no browser.
 * Retorna null se as env vars não estiverem configuradas —
 * o chamador deve cair para polling como fallback.
 *
 * Aceita tanto NEXT_PUBLIC_SUPABASE_ANON_KEY (padrão atual)
 * quanto NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (alias legado).
 */
export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) return null

  if (!_client) {
    _client = createBrowserClient(url, key)
  }
  return _client
}
