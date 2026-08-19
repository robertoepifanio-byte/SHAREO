// Config de client do @sentry/nextjs v9+ (antes: sentry.client.config.ts).
import * as Sentry from "@sentry/nextjs"
import { scrubEvent } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  enabled: process.env.NODE_ENV !== "test",
  tracesSampleRate:         process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
  beforeSend(event) {
    if (process.env.NODE_ENV === "test") return null
    return scrubEvent(event)
  },
})

// Instrumenta as transições de rota do App Router (navegação client-side).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
