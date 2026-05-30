import * as Sentry from "@sentry/nextjs"

const SENSITIVE_RE = /cpf|cnpj|email|phone|password|passwordHash|token|accessToken|refreshToken|authorization|cookie|key|apiKey|secret|consentIp/i

function scrub<T>(value: T, depth = 0): T {
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

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV !== "test",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === "test") return null
    if (event.user) event.user = { id: event.user.id }
    if (event.request?.data) event.request.data = scrub(event.request.data)
    if (event.extra)         event.extra        = scrub(event.extra)
    if (event.contexts)      event.contexts     = scrub(event.contexts) as typeof event.contexts
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>
      for (const k of Object.keys(h)) if (SENSITIVE_RE.test(k)) h[k] = "[Filtered]"
    }
    if (event.request?.url) {
      try {
        const u = new URL(event.request.url)
        for (const k of Array.from(u.searchParams.keys())) {
          if (SENSITIVE_RE.test(k)) u.searchParams.set(k, "[Filtered]")
        }
        event.request.url = u.toString()
      } catch { /* noop */ }
    }
    return event
  },
})
