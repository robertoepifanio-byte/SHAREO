// Fonte: components/bookings/PayButton.tsx
// Transcrição mobile do botão "Pagar agora" da reserva confirmada.
// Abre o Checkout da Stripe via expo-web-browser (openAuthSessionAsync)
// com deep link de retorno shareo:// — ao fechar o browser, a tela
// de reserva é invalidada e relida automaticamente.

import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native"
import * as WebBrowser from "expo-web-browser"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { CHECKOUT_MAX_CENTS } from "@/lib/pricing"

// Estilos que não dependem de tokens de tema — criados uma única vez fora do componente.
const ss = StyleSheet.create({
  container:  { gap: 8 },
  btn: {
    height:         44,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
    flexDirection:  "row",
    gap:            8,
  },
  btnDisabled: { backgroundColor: "#94A3B8" },
  btnLabel:    { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  footerBold:  { fontWeight: "600" },
  errorText:   { fontSize: 13, textAlign: "center", color: "#EF4444" },
  limitBox: {
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       "#FDE68A",
    backgroundColor:   "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical:   8,
  },
  limitText: { fontSize: 12, color: "#92400E" },
})

interface PayButtonProps {
  bookingId:  string
  totalPrice: number
}

export function PayButton({ bookingId, totalPrice }: PayButtonProps) {
  const { tokens } = useTheme()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const exceedsLimit = totalPrice > CHECKOUT_MAX_CENTS

  const handlePay = useCallback(async function handlePay() {
    setLoading(true)
    setError(null)

    try {
      const json = await apiFetch<{ data: { url: string } }>("/api/payments/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId, client: "mobile" }),
      })

      // openAuthSessionAsync abre o Checkout da Stripe em SafariViewController
      // (iOS) / Chrome Custom Tab (Android) e aguarda até o usuário fechar o
      // browser ou ser redirecionado para shareo://
      await WebBrowser.openAuthSessionAsync(json.data.url, "shareo://")

      // Independentemente do resultado (success / dismiss / cancel), invalida
      // a query da reserva para que o paymentStatus seja relido do servidor.
      // O webhook Stripe já terá marcado PAID antes do retorno na maioria dos casos.
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar pagamento."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [bookingId, queryClient])

  if (exceedsLimit) {
    return (
      <View style={ss.container}>
        <TouchableOpacity
          disabled
          accessibilityRole="button"
          accessibilityLabel="Pagamento indisponível"
          style={[ss.btn, ss.btnDisabled]}
        >
          <Text style={ss.btnLabel}>Pagamento indisponível</Text>
        </TouchableOpacity>
        <View style={ss.limitBox}>
          <Text style={ss.limitText}>
            Locações acima de R$ 500 não estão disponíveis nesta versão.
            Entre em contato com o suporte para mais informações.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={ss.container}>
      <TouchableOpacity
        onPress={handlePay}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Pagar agora"
        style={[ss.btn, { backgroundColor: loading ? "#94A3B8" : tokens.green }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : null}
        <Text style={ss.btnLabel}>
          {loading ? "Redirecionando…" : "Pagar agora"}
        </Text>
      </TouchableOpacity>

      {error ? (
        <Text style={ss.errorText}>{error}</Text>
      ) : null}

      <Text style={{ fontSize: 12, textAlign: "center", color: tokens.muted }}>
        Pagamento seguro via{" "}
        <Text style={[ss.footerBold, { color: tokens.text }]}>Stripe</Text>
        {" "}· Seus dados são protegidos
      </Text>
    </View>
  )
}
