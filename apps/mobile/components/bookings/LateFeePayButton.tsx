// Fonte: components/bookings/LateFeePayButton.tsx + app/reservas/[id]/page.tsx
// Transcrição mobile do botão "Pagar taxa de atraso" da tela da reserva (só o
// locatário vê). Pede ao servidor uma Checkout Session nova da multa (o valor
// é recalculado lá — o app não envia nada) e abre no navegador do sistema; ao
// fechar, a reserva é relida para o app mostrar "Taxa de atraso paga".

import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native"
import * as WebBrowser from "expo-web-browser"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { fmtCurrency } from "@/lib/pricing"

const ss = StyleSheet.create({
  container: { marginTop: 12, gap: 8 },
  btn: {
    minHeight:         44,
    borderRadius:      8,
    paddingHorizontal: 16,
    alignItems:        "center",
    justifyContent:    "center",
    flexDirection:     "row",
    gap:               8,
  },
  btnLabel:  { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  errorText: { fontSize: 12, color: "#EF4444" },
})

interface LateFeePayButtonProps {
  bookingId: string
  amount:    number
}

export function LateFeePayButton({ bookingId, amount }: LateFeePayButtonProps) {
  const { tokens } = useTheme()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handlePay = useCallback(async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const json = await apiFetch<{ data: { url: string } }>(
        `/api/bookings/${bookingId}/late-fee/pay`,
        { method: "POST" },
      )
      // A sessão volta para a página web da reserva (não shareo://): ao pagar, o
      // locatário fecha o navegador e a invalidação abaixo relê o estado.
      await WebBrowser.openAuthSessionAsync(json.data.url, "shareo://")
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pagamento.")
    } finally {
      setLoading(false)
    }
  }, [bookingId, queryClient])

  const label = `Pagar taxa de atraso (${fmtCurrency(amount)})`

  return (
    <View style={ss.container}>
      <TouchableOpacity
        onPress={handlePay}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[ss.btn, { backgroundColor: loading ? "#94A3B8" : tokens.green }]}
      >
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
        <Text style={ss.btnLabel}>{loading ? "Redirecionando…" : label}</Text>
      </TouchableOpacity>
      {error ? <Text style={ss.errorText}>{error}</Text> : null}
    </View>
  )
}
