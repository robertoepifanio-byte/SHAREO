import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native"
import { useState } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { deriveBookingHistory } from "@/lib/bookingHistory"

interface BookingDetail {
  id:            string
  status:        string
  paymentStatus: string | null
  startDate:     string
  endDate:       string
  totalPrice:    number
  depositAmount: number | null
  borrowerNote:  string | null
  createdAt:            string
  respondedAt:          string | null
  paidAt:               string | null
  activatedAt:          string | null
  returnRequestedAt:    string | null
  returnedAt:           string | null
  cancelledAt:          string | null
  cancelReason:         string | null
  extensionRequestedAt: string | null
  extensionRespondedAt: string | null
  extensionStatus:      string | null
  item: {
    id: string; title: string
    images: { url: string }[]
    pricePerDay: number
  }
  owner:    { id: string; name: string }
  borrower: { id: string; name: string }
  conversation: { id: string } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Aguardando aprovação", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  CONFIRMED: { label: "Confirmada",            color: "text-brand",      bg: "bg-emerald-50 border-emerald-200" },
  ACTIVE:    { label: "Em andamento",          color: "text-brand",      bg: "bg-emerald-50 border-emerald-200" },
  RETURNED:  { label: "Devolução em andamento", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  COMPLETED: { label: "Concluída",             color: "text-success",   bg: "bg-emerald-50 border-emerald-200" },
  CANCELLED: { label: "Cancelada",             color: "text-muted",     bg: "bg-gray-50 border-border" },
  DISPUTED:  { label: "Em disputa",            color: "text-red-600",   bg: "bg-red-50 border-red-200" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })

const fmtEventDateTime = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(new Date(d))

const ACTOR_ROLE_EMOJI: Record<string, string> = {
  borrower: "👤",
  owner:    "🏠",
  system:   "⚙️",
}

export default function BookingDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const insets   = useSafeAreaInsets()
  const user     = useAuth((s) => s.user)
  const qc       = useQueryClient()
  const [historyExpanded, setHistoryExpanded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn:  () => apiFetch<{ data: BookingDetail }>(`/api/bookings/${id}`),
    enabled:  !!id && !!user,
  })

  const cancel = useMutation({
    mutationFn: () => apiFetch(`/api/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    },
    onError: () => Alert.alert("Erro", "Não foi possível cancelar a reserva."),
  })

  // Fluxo de devolução: locatário inicia (mark_returned → "Devolução em andamento"),
  // locador confirma o recebimento (confirm_return → "Concluído").
  const returnAction = useMutation({
    mutationFn: (action: "mark_returned" | "confirm_return") =>
      apiFetch(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    },
    onError: (e) =>
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível concluir a ação."),
  })

  // Checkout Mercado Pago — abre o init_point via Linking (navegador externo ou WebView nativa)
  // Usa a rota web unificada /api/payments/mp/checkout (aceita Bearer JWT via resolveUserId);
  // `client: "mobile"` faz o backend usar back_urls por deep-link shareo://.
  // Inerte-seguro: quando a flag mercadoPagoEnabled está OFF, o endpoint retorna 404
  // e exibimos mensagem amigável ("pagamento indisponível") sem quebrar o fluxo.
  const mpCheckout = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ data: { url: string | null } }>(
        "/api/payments/mp/checkout",
        { method: "POST", body: JSON.stringify({ bookingId: id, client: "mobile" }) },
      )
      return res.data.url
    },
    onSuccess: async (url) => {
      if (!url) {
        Alert.alert(
          "Pagamento indisponível",
          "O pagamento online ainda não está disponível nesta versão. Entre em contato com o proprietário para combinar o pagamento.",
        )
        return
      }
      // Abre o Checkout MP no navegador do sistema operacional.
      // O retorno acontece via deep-link shareo:// quando o usuário conclui,
      // cancela ou a transação fica pendente no lado do MP.
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        Alert.alert("Erro", "Não foi possível abrir o link de pagamento.")
      }
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : ""
      if (msg.includes("404") || msg.includes("indisponível") || msg.includes("NOT_FOUND")) {
        Alert.alert(
          "Pagamento indisponível",
          "O pagamento online ainda não está disponível nesta versão.",
        )
      } else if (msg.includes("OWNER_NOT_CONNECTED")) {
        Alert.alert(
          "Proprietário sem conta de pagamento",
          "O proprietário ainda não conectou uma conta para receber. Entre em contato via chat.",
        )
      } else if (msg.includes("BOOKING_NOT_CONFIRMED")) {
        Alert.alert(
          "Aguardando confirmação",
          "O proprietário precisa confirmar a reserva antes do pagamento.",
        )
      } else {
        Alert.alert("Erro", msg || "Não foi possível iniciar o pagamento.")
      }
    },
  })

  const booking = data?.data

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted">Login necessário</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  if (!booking) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-4xl">😕</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Reserva não encontrada</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-sm text-brand">← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st = STATUS_LABEL[booking.status] ?? { label: booking.status, color: "text-muted", bg: "bg-gray-50 border-border" }
  const isOwner    = user.id === booking.owner.id
  const isBorrower = user.id === booking.borrower.id
  const canCancel        = (booking.status === "PENDING" || booking.status === "ACTIVE") && isBorrower
  const canReturn        = booking.status === "ACTIVE"   && isBorrower
  const canConfirmReturn = booking.status === "RETURNED" && isOwner
  // Pagamento MP: somente o locatário, reserva CONFIRMED, ainda não paga
  const canPay = isBorrower && booking.status === "CONFIRMED" && booking.paymentStatus !== "PAID"
  const thumb            = booking.item.images[0]?.url

  function handleCancel() {
    Alert.alert(
      "Cancelar reserva",
      "Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.",
      [
        { text: "Voltar", style: "cancel" },
        { text: "Cancelar reserva", style: "destructive", onPress: () => cancel.mutate() },
      ]
    )
  }

  function handleReturn() {
    Alert.alert(
      "Devolver item",
      "Confirmar que você está devolvendo o item? O locador precisará confirmar o recebimento para concluir a locação.",
      [
        { text: "Voltar", style: "cancel" },
        { text: "Devolver", onPress: () => returnAction.mutate("mark_returned") },
      ]
    )
  }

  function handleConfirmReturn() {
    Alert.alert(
      "Confirmar recebimento",
      "Confirmar que você recebeu o item de volta? Isso concluirá a locação.",
      [
        { text: "Voltar", style: "cancel" },
        { text: "Confirmar recebimento", onPress: () => returnAction.mutate("confirm_return") },
      ]
    )
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Text className="text-2xl text-muted">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-primary">Reserva</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Status badge */}
        <View className={`mb-4 rounded-xl border px-4 py-3 ${st.bg}`}>
          <Text className={`text-sm font-bold ${st.color}`}>{st.label}</Text>
          <Text className="mt-0.5 text-xs text-muted">
            Criada em {fmtDate(booking.createdAt)}
          </Text>
        </View>

        {/* ─── Histórico de eventos ─── */}
        {(() => {
          const historyEvents = deriveBookingHistory({
            createdAt:            new Date(booking.createdAt),
            respondedAt:          booking.respondedAt          ? new Date(booking.respondedAt)          : null,
            paidAt:               booking.paidAt               ? new Date(booking.paidAt)               : null,
            activatedAt:          booking.activatedAt          ? new Date(booking.activatedAt)          : null,
            returnRequestedAt:    booking.returnRequestedAt    ? new Date(booking.returnRequestedAt)    : null,
            returnedAt:           booking.returnedAt           ? new Date(booking.returnedAt)           : null,
            cancelledAt:          booking.cancelledAt          ? new Date(booking.cancelledAt)          : null,
            cancelReason:         booking.cancelReason,
            extensionRequestedAt: booking.extensionRequestedAt ? new Date(booking.extensionRequestedAt) : null,
            extensionRespondedAt: booking.extensionRespondedAt ? new Date(booking.extensionRespondedAt) : null,
            extensionStatus:      booking.extensionStatus,
            status:               booking.status,
            borrower:             { name: booking.borrower.name },
            owner:                { name: booking.owner.name },
          })
          if (historyEvents.length === 0) return null
          const sorted = [...historyEvents].reverse() // mais recente primeiro
          const latest  = sorted[0]

          return (
            <View className="mb-4 rounded-xl border border-border bg-surface overflow-hidden">
              {/* Botão de toggle — mínimo 44px de altura */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={historyExpanded ? "Ocultar histórico da locação" : "Ver histórico da locação"}
                accessibilityState={{ expanded: historyExpanded }}
                onPress={() => setHistoryExpanded((v) => !v)}
                activeOpacity={0.7}
                className="min-h-[44px] flex-row items-center justify-between px-4 py-3"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Histórico da locação
                  </Text>
                  <Text className="text-xs text-muted">
                    ({historyEvents.length} evento{historyEvents.length !== 1 ? "s" : ""})
                  </Text>
                </View>
                <Text className="text-base text-muted-foreground">
                  {historyExpanded ? "⌃" : "⌄"}
                </Text>
              </TouchableOpacity>

              {/* Preview do evento mais recente — visível com o painel recolhido */}
              {!historyExpanded && latest && (
                <View className="border-t border-border px-4 pb-3 pt-2">
                  <Text className="text-xs text-muted">Último evento</Text>
                  <Text className="mt-0.5 text-sm font-semibold text-brand">{latest.label}</Text>
                  <Text className="text-xs text-muted">{fmtEventDateTime(latest.at.toISOString())}</Text>
                </View>
              )}

              {/* Lista expandida */}
              {historyExpanded && (
                <View className="border-t border-border px-4 pb-4 pt-3">
                  {sorted.map((event, idx) => {
                    const isFirst = idx === 0
                    const isLast  = idx === sorted.length - 1
                    return (
                      <View key={event.key} className="flex-row gap-3 pb-4 last:pb-0">
                        {/* Coluna esquerda: linha + dot */}
                        <View className="items-center" style={{ width: 24 }}>
                          <View
                            className={[
                              "h-6 w-6 rounded-full items-center justify-center",
                              isFirst ? "bg-brand" : "bg-surface border border-border",
                            ].join(" ")}
                          >
                            {isFirst ? (
                              <Text className="text-white text-xs font-bold">✓</Text>
                            ) : (
                              <View className="h-2 w-2 rounded-full bg-muted" />
                            )}
                          </View>
                          {!isLast && (
                            <View className="flex-1 w-px bg-border mt-1" />
                          )}
                        </View>

                        {/* Conteúdo do evento */}
                        <View className="flex-1 pb-0">
                          <Text className={[
                            "text-sm font-semibold leading-tight",
                            isFirst ? "text-brand" : "text-foreground",
                          ].join(" ")}>
                            {event.label}
                          </Text>
                          <Text className="mt-0.5 text-xs text-muted">
                            {fmtEventDateTime(event.at.toISOString())}
                          </Text>
                          {event.actor && (
                            <Text className="mt-0.5 text-xs text-muted">
                              {ACTOR_ROLE_EMOJI[event.actorRole]} {event.actor}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })()}

        {/* Item card */}
        <TouchableOpacity
          className="mb-4 flex-row overflow-hidden rounded-2xl border border-border bg-surface"
          onPress={() => router.push(`/itens/${booking.item.id}`)}
          activeOpacity={0.85}
        >
          <View className="h-20 w-20 bg-muted/20">
            {thumb ? (
              <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-2xl">📦</Text>
              </View>
            )}
          </View>
          <View className="flex-1 justify-center p-3">
            <Text className="text-sm font-bold text-primary" numberOfLines={2}>
              {booking.item.title}
            </Text>
            <Text className="mt-0.5 text-xs text-muted">
              {isOwner ? `Locatário: ${booking.borrower.name}` : `Proprietário: ${booking.owner.name}`}
            </Text>
          </View>
          <View className="items-center justify-center pr-3">
            <Text className="text-xl text-muted">›</Text>
          </View>
        </TouchableOpacity>

        {/* Datas */}
        <View className="mb-4 rounded-xl border border-border bg-surface p-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Período</Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-xs text-muted">Início</Text>
              <Text className="text-sm font-semibold text-foreground">{fmtDate(booking.startDate)}</Text>
            </View>
            <Text className="text-muted">→</Text>
            <View className="flex-1 items-end">
              <Text className="text-xs text-muted">Fim</Text>
              <Text className="text-sm font-semibold text-foreground">{fmtDate(booking.endDate)}</Text>
            </View>
          </View>
        </View>

        {/* Valores */}
        <View className="mb-4 rounded-xl border border-border bg-surface p-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Valores</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">Total do aluguel</Text>
            <Text className="text-sm font-bold text-foreground">{fmt(booking.totalPrice)}</Text>
          </View>
          {booking.depositAmount != null && booking.depositAmount > 0 && (
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm text-muted">Caução (devolvida)</Text>
              <Text className="text-sm font-medium text-amber-700">{fmt(booking.depositAmount)}</Text>
            </View>
          )}
        </View>

        {/* Observações */}
        {booking.borrowerNote && (
          <View className="mb-4 rounded-xl border border-border bg-surface p-4">
            <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">Observações</Text>
            <Text className="text-sm text-foreground leading-relaxed">{booking.borrowerNote}</Text>
          </View>
        )}

      </ScrollView>

      {/* Bottom actions */}
      <View
        className="border-t border-border bg-surface px-4 py-3 gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* Pagamento MP — somente quando locador confirmou e ainda não foi pago */}
        {canPay && (
          <TouchableOpacity
            className="min-h-[52px] items-center justify-center rounded-xl bg-brand"
            onPress={() => mpCheckout.mutate()}
            activeOpacity={0.85}
            disabled={mpCheckout.isPending}
            accessibilityRole="button"
            accessibilityLabel="Pagar com Mercado Pago"
          >
            {mpCheckout.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white">Pagar reserva</Text>
            )}
          </TouchableOpacity>
        )}

        {booking.conversation && (
          <TouchableOpacity
            className="min-h-[44px] items-center justify-center rounded-xl border border-brand py-3"
            onPress={() => router.push(`/mensagens/${booking.conversation!.id}`)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir conversa com o proprietário"
          >
            <Text className="text-sm font-bold text-brand">Abrir conversa</Text>
          </TouchableOpacity>
        )}
        {canReturn && (
          <TouchableOpacity
            className="min-h-[44px] rounded-xl bg-brand py-3 items-center justify-center"
            onPress={handleReturn}
            activeOpacity={0.85}
            disabled={returnAction.isPending}
            accessibilityRole="button"
            accessibilityLabel="Devolver item"
          >
            {returnAction.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white">📦 Devolver</Text>
            )}
          </TouchableOpacity>
        )}
        {canConfirmReturn && (
          <TouchableOpacity
            className="min-h-[44px] rounded-xl bg-brand py-3 items-center justify-center"
            onPress={handleConfirmReturn}
            activeOpacity={0.85}
            disabled={returnAction.isPending}
            accessibilityRole="button"
            accessibilityLabel="Confirmar recebimento do item"
          >
            {returnAction.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white">📦 Confirmar recebimento</Text>
            )}
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            className="min-h-[44px] rounded-xl bg-red-50 border border-red-200 py-3 items-center justify-center"
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={cancel.isPending}
            accessibilityRole="button"
            accessibilityLabel="Cancelar reserva"
          >
            {cancel.isPending ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Text className="text-sm font-bold text-red-600">Cancelar reserva</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
