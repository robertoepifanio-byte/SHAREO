import * as Sentry from "@sentry/nextjs"
import { scrubEvent } from "@/lib/sentry-scrub"

// Edge Runtime — roda em middleware e Edge API Routes.
// Auditoria s40 / ressalva #4: o scrub anterior era raso (não recursivo) e
// não usava o mesmo SENSITIVE_RE do server/client. Agora todos os runtimes
// compartilham lib/sentry-scrub.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV !== "test",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === "test") return null
    return scrubEvent(event)
  },
})
