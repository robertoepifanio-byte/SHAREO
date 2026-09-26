import * as Sentry from "@sentry/nextjs"
import { scrubEvent } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  // Alinha com o release que withSentryConfig usa no upload de source maps.
  // BUILD_COMMIT_SHA é inlinado por next.config.ts a partir do github.sha do deploy.
  release: process.env.BUILD_COMMIT_SHA,
  enabled: process.env.NODE_ENV !== "test",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === "test") return null
    return scrubEvent(event)
  },
})
