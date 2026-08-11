// Fonte: components/shared/ResendVerificationButton.tsx (variant="inline")
// Transcrição literal do CTA de reenvio que aparece dentro do box de erro do
// _PriceCalc no site: mesmos rótulos, mesmos estados (idle/loading/success/error)
// e mesmo tratamento de 429 (limite de reenvios).

import React, { useState } from "react"
import { Text, TouchableOpacity, StyleSheet } from "react-native"
import { apiFetch, hasErrorStatus } from "@/lib/api"
import { useTheme } from "@/lib/theme"

type State = "idle" | "loading" | "success" | "error"

export function ResendVerificationLink() {
  const { tokens } = useTheme()
  const [state, setState]       = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handlePress() {
    setState("loading")
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" })
      setState("success")
    } catch (err: unknown) {
      if (hasErrorStatus(err, 429)) {
        setErrorMsg("Limite de reenvios atingido. Aguarde alguns minutos e tente novamente.")
      } else if (err instanceof Error && err.message) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg("Falha de conexão. Verifique sua internet e tente novamente.")
      }
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <Text style={[s.msg, { color: tokens.success }]}>
        E-mail de verificação enviado. Verifique sua caixa de entrada e a pasta de spam.
      </Text>
    )
  }

  if (state === "error") {
    return <Text style={[s.msg, { color: tokens.error }]}>{errorMsg}</Text>
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={state === "loading"}
      accessibilityRole="button"
      accessibilityLabel="Reenviar e-mail de verificação"
      style={s.tap}
    >
      <Text style={[s.link, { color: tokens.green, opacity: state === "loading" ? 0.6 : 1 }]}>
        {state === "loading" ? "Enviando…" : "Reenviar e-mail de verificação →"}
      </Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  // Tap target de 44px (regra do design system) sem inflar o box de erro:
  // a altura vem do padding vertical somado à linha do texto.
  tap:  { minHeight: 44, justifyContent: "center" },
  link: { fontSize: 13, fontWeight: "600" },
  msg:  { fontSize: 13, marginTop: 6 },
})
