// ⚠️ TEMPORÁRIO — REMOVER antes do merge do PR #319.
"use client"
import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

export function ClientTrigger() {
  const [eventId, setEventId] = useState<string | null>(null)

  return (
    <div>
      <button
        onClick={() => {
          const marker = `sentry-v10-verify-client-${Date.now()}`
          const id     = Sentry.captureException(new Error(marker))
          setEventId(id)
        }}
        style={{
          padding: "12px 20px",
          fontSize: 16,
          borderRadius: 8,
          border: "1px solid #003366",
          background: "#003366",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Disparar evento de client
      </button>
      {eventId && (
        <p style={{ marginTop: 16, fontFamily: "monospace", color: "#007B3C" }}>
          eventId: {eventId}
        </p>
      )}
    </div>
  )
}
