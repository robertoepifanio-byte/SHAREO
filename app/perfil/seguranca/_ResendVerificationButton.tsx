"use client"

import { useState } from "react"

type State = "idle" | "loading" | "success" | "error"

export function ResendVerificationButton() {
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleClick() {
    setState("loading")
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        if (json?.error?.code === "ALREADY_VERIFIED") {
          // Should not normally happen — refresh page
          window.location.reload()
          return
        }
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "", 10)
          const minutes = Number.isFinite(retryAfter) ? Math.max(1, Math.ceil(retryAfter / 60)) : null
          setErrorMsg(
            minutes
              ? `Limite de reenvios atingido. Tente novamente em ${minutes} minuto${minutes > 1 ? "s" : ""}.`
              : "Limite de reenvios atingido. Aguarde alguns minutos e tente novamente."
          )
        } else {
          setErrorMsg(json?.error?.message ?? "Não foi possível enviar o e-mail. Tente novamente mais tarde.")
        }
        setState("error")
        return
      }
      setState("success")
    } catch {
      setErrorMsg("Falha de conexão. Verifique sua internet e tente novamente.")
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <p className="text-sm text-green-700">
        E-mail de verificação enviado. Verifique sua caixa de entrada e a pasta de spam.
      </p>
    )
  }

  if (state === "error") {
    return (
      <p className="text-sm text-destructive">{errorMsg}</p>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "loading"}
      className="inline-flex h-9 items-center rounded-lg border border-yellow-400 bg-yellow-50 px-4 text-xs font-semibold text-yellow-800 transition-colors hover:bg-yellow-100 disabled:opacity-60"
    >
      {state === "loading" ? "Enviando..." : "Reenviar e-mail de verificação"}
    </button>
  )
}
