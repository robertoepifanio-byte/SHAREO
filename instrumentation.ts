import * as Sentry from "@sentry/nextjs"

// Modelo de inicialização do @sentry/nextjs v9+: o SDK não auto-injeta mais os
// sentry.server/edge.config.ts — eles são importados aqui, por runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Captura erros de renderização/handlers (App Router) — substitui o antigo
// hook automático do v8.
export const onRequestError = Sentry.captureRequestError
