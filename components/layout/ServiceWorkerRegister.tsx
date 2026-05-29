"use client"

import { useEffect } from "react"

/**
 * Registra o Service Worker apenas em produção.
 * Em desenvolvimento (Turbopack) a CSP bloqueia blob: workers — skip.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("[SW] registration failed:", err))
  }, [])

  return null
}
