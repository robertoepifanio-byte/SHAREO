/**
 * lib/sentry-scrub.ts — Scrub de PII compartilhado entre sentry.server,
 * sentry.client e sentry.edge.
 *
 * Auditoria s40 / ressalvas #4 e #5:
 *   - sentry.edge.config.ts tinha scrub raso (não recursivo).
 *   - SENSITIVE_RE omitia pixKey / holderName / responsavelLegal.
 *
 * Este módulo é importado pelos três configs para garantir paridade.
 * Não usar "use client" — este arquivo roda em todos os runtimes (Node, Edge, browser).
 */

import type { ErrorEvent } from "@sentry/nextjs"

// Campos que NUNCA devem aparecer em eventos do Sentry.
// Regra de nomenclatura: cobre variantes camelCase, snake_case e plurais.
export const SENSITIVE_RE =
  /cpf|cnpj|email|phone|password|passwordHash|token|accessToken|refreshToken|authorization|cookie|key|apiKey|secret|consentIp|pixKey|holderName|responsavelLegal|cnpjResponsavelLegal|cpfResponsavel/i

/**
 * Scrub recursivo de objetos — substitui valores cujas CHAVES batem em
 * SENSITIVE_RE por "[Filtered]". Limita a profundidade em 6 para evitar
 * referências circulares ou objetos gigantes.
 */
export function scrub<T>(value: T, depth = 0): T {
  if (depth > 6 || value == null) return value
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1)) as unknown as T
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_RE.test(k) ? "[Filtered]" : scrub(v, depth + 1)
    }
    return out as T
  }
  return value
}

/**
 * Aplica scrub completo num evento Sentry (request body, extra, contexts,
 * headers e query string da URL).
 * Retorna o evento modificado in-place para compatibilidade com o tipo ErrorEvent.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // Preservar apenas o ID interno — nunca e-mail, nome ou IP do usuário
  if (event.user) {
    const id = typeof event.user.id === "string" ? event.user.id : String(event.user.id ?? "")
    event.user = { id }
  }

  if (event.request?.data)    event.request.data    = scrub(event.request.data)
  if (event.extra)            event.extra           = scrub(event.extra) as typeof event.extra
  if (event.contexts)         event.contexts        = scrub(event.contexts) as typeof event.contexts

  if (event.request?.headers) {
    const h = event.request.headers as Record<string, string>
    for (const k of Object.keys(h)) {
      if (SENSITIVE_RE.test(k)) h[k] = "[Filtered]"
    }
  }

  if (event.request?.url) {
    try {
      const u = new URL(event.request.url)
      for (const k of Array.from(u.searchParams.keys())) {
        if (SENSITIVE_RE.test(k)) u.searchParams.set(k, "[Filtered]")
      }
      event.request.url = u.toString()
    } catch { /* URL inválida — ignorar */ }
  }

  return event
}
