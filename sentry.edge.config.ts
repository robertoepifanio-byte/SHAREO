import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV !== "test",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === "test") return null
    if (event.user) event.user = { id: event.user.id }
    const SENSITIVE = /cpf|cnpj|email|phone|password|token|key|secret|authorization|cookie|consentIp/i
    if (event.request?.data && typeof event.request.data === "object") {
      const d = event.request.data as Record<string, unknown>
      for (const k of Object.keys(d)) if (SENSITIVE.test(k)) d[k] = "[Filtered]"
    }
    return event
  },
})
