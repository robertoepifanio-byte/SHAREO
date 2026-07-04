// Fonte: app/reservas/[id]/page.tsx + app/reservas/[id]/_BookingActions.tsx
//        + lib/bookingHistory.ts
// Detalhe da reserva: status, histórico de eventos, datas, valores, pagamento MP,
// token de retirada, avisos de status, ações (cancelar, devolver, confirmar).
// StyleSheet + tokens (useTheme) — migrado de className NativeWind para garantir
// compatibilidade com todos os bundles de produção.

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, StyleSheet, Modal, TextInput } from "react-native"
import { useState } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { deriveBookingHistory } from "@/lib/bookingHistory"

interface BookingDetail {
  id:            string
  status:        string
  paymentStatus: string | null
  startDate:     string
  endDate:       string
  totalDays:     number
  dailyPrice:    number
  totalPrice:    number
  discountCents: number | null
  depositAmount: number | null
  borrowerNote:  string | null
  cancelReason:  string | null
  lateFeeAmount: number | null
  // timestamps de histórico — fonte: app/reservas/[id]/page.tsx linhas 83-96
  createdAt:            string
  respondedAt:          string | null
  paidAt:               string | null
  pixDeclaredAt:        string | null
  contractSignedAt:     string | null
  activatedAt:          string | null
  returnRequestedAt:    string | null
  returnedAt:           string | null
  cancelledAt:          string | null
  extensionRequestedAt:      string | null
  extensionRespondedAt:      string | null
  extensionStatus:           string | null
  extensionRequestedEndDate: string | null
  // token de retirada — fonte: app/reservas/[id]/page.tsx linhas 116-118
  pickupToken:       string | null
  pickupTokenUsedAt: string | null
  item: {
    id: string; title: string
    images: { url: string }[]
  }
  // Story B — fonte: app/reservas/[id]/page.tsx linhas 107-114
  bookingItems: {
    itemId: string; totalPrice: number
    item: { title: string; images: { url: string }[] }
  }[]
  owner: {
    id: string; name: string
    cep: string | null; street: string | null; neighborhood: string | null
    city: string | null; state: string | null
  }
  borrower: { id: string; name: string }
  conversation: { id: string } | null
}

// Formata o endereço de retirada — fonte: app/reservas/[id]/page.tsx linhas 42-53 (fmtOwnerAddress)
function fmtOwnerAddress(owner: BookingDetail["owner"]): string | null {
  const parts: string[] = []
  if (owner.street)       parts.push(owner.street)
  if (owner.neighborhood) parts.push(owner.neighborhood)
  if (owner.city && owner.state) parts.push(`${owner.city} — ${owner.state}`)
  else if (owner.city)    parts.push(owner.city)
  if (owner.cep)          parts.push(`CEP ${owner.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`)
  return parts.length ? parts.join(", ") : null
}

// Split da taxa da plataforma — fonte: app/reservas/[id]/page.tsx linhas 147-153.
// A taxa é RETIDA do repasse ao proprietário (não somada ao locatário); o
// cupom é absorvido pela taxa, nunca pelo proprietário. feeRateBps SEMPRE
// dinâmico (nunca hardcode — regra do CLAUDE.md), fonte: /api/stats.
function calcSplit(totalPrice: number, feeRateBps: number) {
  const platformFeeAmount = Math.round(totalPrice * feeRateBps / 10000)
  const ownerNetAmount    = totalPrice - platformFeeAmount
  return { platformFeeAmount, ownerNetAmount }
}

// Mapeamento de status — fonte: app/reservas/[id]/page.tsx + BookingStatusBadge.tsx
// Cores mapeadas para tokens disponíveis no tailwind.config.js do mobile
const STATUS_LABEL: Record<string, { label: string; borderColor: string; bgColor: string; textColor: string }> = {
  PENDING:   { label: "Aguardando aprovação",   borderColor: "#FCD34D", bgColor: "#FFFBEB", textColor: "#92400E" },
  CONFIRMED: { label: "Confirmada",             borderColor: "#6EE7B7", bgColor: "#ECFDF5", textColor: "#065F46" },
  ACTIVE:    { label: "Em andamento",           borderColor: "#93C5FD", bgColor: "#EFF6FF", textColor: "#1E40AF" },
  RETURNED:  { label: "Devolução em andamento", borderColor: "#C4B5FD", bgColor: "#F5F3FF", textColor: "#6D28D9" },
  COMPLETED: { label: "Concluída",              borderColor: "#6EE7B7", bgColor: "#ECFDF5", textColor: "#065F46" },
  CANCELLED: { label: "Cancelada",              borderColor: "#E2E8F0", bgColor: "#F8FAFC", textColor: "#64748B" },
  DISPUTED:  { label: "Em disputa",             borderColor: "#FECACA", bgColor: "#FEF2F2", textColor: "#991B1B" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })

// Mesmo formato do site — fmtDateTimeBR (fonte: app/reservas/[id]/page.tsx linha 28)
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
  const { id }     = useLocalSearchParams<{ id: string }>()
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const { tokens } = useTheme()
  const qc         = useQueryClient()
  const [historyExpanded, setHistoryExpanded] = useState(false)
  // Painel de cancelamento — fonte: _BookingActions.tsx linhas 43-46, 118-119, 262-283
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [cancelReason, setCancelReason]             = useState("")

  // Todos os hooks ANTES de qualquer return condicional (protocolo item 4)
  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn:  () => apiFetch<{ data: BookingDetail }>(`/api/bookings/${id}`),
    enabled:  !!id && !!user,
  })

  // Taxa da plataforma — NUNCA hardcode (regra do CLAUDE.md). Fonte:
  // app/reservas/[id]/page.tsx linha 136-137 (getPlatformFeeRate() no
  // Server Component). Mobile reaproveita /api/stats, mesmo padrão de
  // app/itens/[id].tsx.
  const { data: statsData } = useQuery({
    queryKey: ["platform-stats"],
    queryFn:  () => apiFetch<{ data: { feeRate: number } }>("/api/stats"),
    staleTime: 5 * 60_000,
  })
  const feeRateBps = statsData?.data.feeRate ?? null

  // BUG FIX: o mobile chamava POST /api/bookings/${id}/cancel (rota inexistente → 404)
  // e não coletava o motivo. O site usa PATCH /api/bookings/${id} com { action:"cancel", reason }
  // e EXIGE o motivo (textarea, botão desabilitado se vazio — _BookingActions.tsx linhas 118-119,
  // 227, 262-283). reason é validado no servidor: transition.requiresReason → 400 se ausente.
  // Fonte: app/api/bookings/[id]/route.ts linhas 138-139, 227-229.
  const cancel = useMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel", reason }),
      }),
    onSuccess: () => {
      setCancelModalVisible(false)
      setCancelReason("")
      qc.invalidateQueries({ queryKey: ["booking", id] })
      qc.invalidateQueries({ queryKey: ["bookings"] })
    },
    onError: (e) =>
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível cancelar a reserva."),
  })

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

  // Checkout Mercado Pago — rota unificada resolveUserId + client:"mobile"
  // Fonte: app/api/payments/mp/checkout/route.ts + PR #161
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
        Alert.alert("Pagamento indisponível", "O pagamento online ainda não está disponível nesta versão.")
      } else if (msg.includes("OWNER_NOT_CONNECTED")) {
        Alert.alert("Proprietário sem conta de pagamento", "O proprietário ainda não conectou uma conta para receber. Entre em contato via chat.")
      } else if (msg.includes("BOOKING_NOT_CONFIRMED")) {
        Alert.alert("Aguardando confirmação", "O proprietário precisa confirmar a reserva antes do pagamento.")
      } else {
        Alert.alert("Erro", msg || "Não foi possível iniciar o pagamento.")
      }
    },
  })

  // ── Guards após hooks (protocolo item 4) ──────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={{ color: tokens.muted, fontSize: 14 }}>Login necessário</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  const booking = data?.data
  if (!booking) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg, paddingHorizontal: 24 }]}>
        <Text style={{ fontSize: 40 }}>😕</Text>
        <Text style={[s.notFoundTitle, { color: tokens.navy }]}>Reserva não encontrada</Text>
        <TouchableOpacity
          style={{ marginTop: 16 }}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 14, color: tokens.green }}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st         = STATUS_LABEL[booking.status] ?? STATUS_LABEL["CANCELLED"]
  const isOwner    = user.id === booking.owner.id
  const isBorrower = user.id === booking.borrower.id
  // Site: PENDING ou CONFIRMED, AMBOS os papéis — fonte: _BookingActions.tsx linha 241-242
  const canCancel        = (booking.status === "PENDING" || booking.status === "CONFIRMED") && (isOwner || isBorrower)
  const canReturn        = booking.status === "ACTIVE"   && isBorrower
  const canConfirmReturn = booking.status === "RETURNED" && isOwner
  const canPay           = isBorrower && booking.status === "CONFIRMED" && booking.paymentStatus !== "PAID"
  const thumb            = booking.item.images[0]?.url
  const extraItems       = booking.bookingItems.length - 1

  // Split — fonte: app/reservas/[id]/page.tsx linhas 150-153
  const discountCents = booking.discountCents ?? 0
  const split = feeRateBps != null
    ? (() => {
        const gross       = calcSplit(booking.totalPrice + discountCents, feeRateBps)
        const platformFee = Math.max(0, gross.platformFeeAmount - discountCents)
        return { platformFee, ownerNet: gross.ownerNetAmount }
      })()
    : null
  const feeRatePct   = feeRateBps != null ? feeRateBps / 100 : null
  const feeRateLabel = feeRatePct != null
    ? (feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : String(feeRatePct))
    : null
  const pickupAddress = fmtOwnerAddress(booking.owner)

  // Histórico de eventos — fonte: lib/bookingHistory.ts (deriveBookingHistory)
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
  const sorted = [...historyEvents].reverse() // mais recente primeiro
  const latest  = sorted[0]

  // Abre o painel de cancelamento com campo de motivo obrigatório.
  // Antes: Alert.alert com confirm direto (sem motivo) → 400 do servidor.
  // Fonte: _BookingActions.tsx linhas 262-283 (panel === "cancel").
  function handleCancel() {
    setCancelModalVisible(true)
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
    <View style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* Header — ← Minhas Reservas (fonte: app/reservas/[id]/page.tsx linha 168-172) */}
      <View
        style={[
          s.header,
          {
            paddingTop:        insets.top + 8,
            backgroundColor:   tokens.surface,
            borderBottomColor: tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Minhas Reservas"
        >
          <Text style={[s.backBtnText, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]} numberOfLines={1}>
          Reserva
        </Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* Badge de status — fonte: app/reservas/[id]/page.tsx linhas 210-224 */}
        <View
          style={[s.statusBadge, { backgroundColor: st.bgColor, borderColor: st.borderColor }]}
        >
          <Text style={[s.statusLabel, { color: st.textColor }]}>{st.label}</Text>
          <Text style={[s.statusSub, { color: tokens.muted }]}>
            Criada em {fmtDate(booking.createdAt)}
          </Text>
        </View>

        {/* Histórico de eventos — fonte: app/reservas/[id]/page.tsx linhas 184-207 + BookingHistory.tsx */}
        {historyEvents.length > 0 && (
          <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            {/* Botão de toggle — mínimo 44px */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={historyExpanded ? "Ocultar histórico da locação" : "Ver histórico da locação"}
              accessibilityState={{ expanded: historyExpanded }}
              onPress={() => setHistoryExpanded((v) => !v)}
              activeOpacity={0.7}
              style={s.historyToggle}
            >
              <View style={s.historyToggleLeft}>
                <Text style={[s.historyTitle, { color: tokens.text }]}>Histórico da locação</Text>
                <Text style={[s.historyCount, { color: tokens.muted }]}>
                  ({historyEvents.length} evento{historyEvents.length !== 1 ? "s" : ""})
                </Text>
              </View>
              <Text style={[s.historyChevron, { color: tokens.muted }]}>
                {historyExpanded ? "⌃" : "⌄"}
              </Text>
            </TouchableOpacity>

            {/* Preview do evento mais recente */}
            {!historyExpanded && latest && (
              <View style={[s.historyPreview, { borderTopColor: tokens.border }]}>
                <Text style={[s.historyPreviewLabel, { color: tokens.muted }]}>Último evento</Text>
                <Text style={[s.historyPreviewEvent, { color: tokens.green }]}>{latest.label}</Text>
                <Text style={[s.historyPreviewTime, { color: tokens.muted }]}>
                  {fmtEventDateTime(latest.at.toISOString())}
                </Text>
              </View>
            )}

            {/* Lista expandida */}
            {historyExpanded && (
              <View style={[s.historyList, { borderTopColor: tokens.border }]}>
                {sorted.map((event, idx) => {
                  const isFirst = idx === 0
                  const isLast  = idx === sorted.length - 1
                  return (
                    <View key={event.key} style={s.historyItem}>
                      {/* Linha + dot */}
                      <View style={s.historyDotCol}>
                        <View
                          style={[
                            s.historyDot,
                            isFirst
                              ? { backgroundColor: tokens.green }
                              : { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border },
                          ]}
                        >
                          {isFirst ? (
                            <Text style={s.historyDotCheck}>✓</Text>
                          ) : (
                            <View style={[s.historyDotInner, { backgroundColor: tokens.border }]} />
                          )}
                        </View>
                        {!isLast && (
                          <View style={[s.historyLine, { backgroundColor: tokens.border }]} />
                        )}
                      </View>
                      {/* Conteúdo */}
                      <View style={s.historyContent}>
                        <Text
                          style={[
                            s.historyEventLabel,
                            { color: isFirst ? tokens.green : tokens.text },
                          ]}
                        >
                          {event.label}
                        </Text>
                        <Text style={[s.historyEventTime, { color: tokens.muted }]}>
                          {fmtEventDateTime(event.at.toISOString())}
                        </Text>
                        {event.actor && (
                          <Text style={[s.historyEventActor, { color: tokens.muted }]}>
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
        )}

        {/* Item card — fonte: app/reservas/[id]/page.tsx linhas 248-268 */}
        <TouchableOpacity
          style={[s.section, s.itemCard, { borderColor: tokens.border }]}
          onPress={() => router.push(`/itens/${booking.item.id}`)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Ver item ${booking.item.title}`}
        >
          <View style={[s.itemThumb, { backgroundColor: tokens.border }]}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View style={s.itemThumbEmpty}>
                <Text style={{ fontSize: 24 }}>📦</Text>
              </View>
            )}
          </View>
          <View style={s.itemInfo}>
            <Text style={[s.itemTitle, { color: tokens.navy }]} numberOfLines={2}>
              {booking.item.title}
              {/* "+N itens" — Story B, fonte: app/reservas/[id]/page.tsx linhas 214-216 */}
              {extraItems > 0 && (
                <Text style={{ fontWeight: "600", color: tokens.muted }}>
                  {" "}+ {extraItems} {extraItems === 1 ? "item" : "itens"}
                </Text>
              )}
            </Text>
            <Text style={[s.itemCounterpart, { color: tokens.muted }]}>
              {isOwner ? `Locatário: ${booking.borrower.name}` : `Proprietário: ${booking.owner.name}`}
            </Text>
          </View>
          <Text style={[s.itemChevron, { color: tokens.muted }]}>›</Text>
        </TouchableOpacity>

        {/* Itens desta locação — Story B, fonte: app/reservas/[id]/page.tsx linhas 226-246 */}
        {booking.bookingItems.length > 1 && (
          <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>
              ITENS DESTA LOCAÇÃO ({booking.bookingItems.length})
            </Text>
            {booking.bookingItems.map((bi, i) => (
              <View
                key={bi.itemId}
                style={[
                  s.multiItemRow,
                  i < booking.bookingItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tokens.border } : undefined,
                ]}
              >
                <View style={[s.multiItemThumb, { backgroundColor: tokens.border }]}>
                  {bi.item.images[0]?.url && (
                    <Image source={{ uri: bi.item.images[0].url }} style={{ flex: 1 }} contentFit="cover" />
                  )}
                </View>
                <Text style={[s.multiItemTitle, { color: tokens.text }]} numberOfLines={1}>
                  {bi.item.title}
                </Text>
                <Text style={[s.multiItemPrice, { color: tokens.muted }]}>{fmt(bi.totalPrice)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Datas — fonte: app/reservas/[id]/page.tsx linhas 255-276 */}
        <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={[s.sectionLabel, { color: tokens.muted }]}>PERÍODO</Text>
          <View style={s.datesRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.dateSubLabel, { color: tokens.muted }]}>
                {booking.activatedAt ? "Retirada (confirmada)" : "Retirada"}
              </Text>
              <Text style={[s.dateValue, { color: tokens.text }]}>
                {fmtDate(booking.activatedAt ?? booking.startDate)}
              </Text>
              {booking.activatedAt && (
                <Text style={[s.dateCaption, { color: tokens.success }]}>✓ Confirmada pelo locador</Text>
              )}
            </View>
            <Text style={[s.dateSep, { color: tokens.muted }]}>→</Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[s.dateSubLabel, { color: tokens.muted }]}>Devolução até</Text>
              <Text style={[s.dateValue, { color: tokens.text }]}>
                {fmtDate(booking.endDate)}
              </Text>
              {booking.activatedAt && (
                <Text style={[s.dateCaption, { color: tokens.muted }]}>Mesmo horário da retirada</Text>
              )}
            </View>
          </View>
        </View>

        {/* Resumo financeiro — fonte: app/reservas/[id]/page.tsx linhas 280-330 */}
        <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={[s.sectionLabel, { color: tokens.muted }]}>VALORES</Text>
          <View style={s.finRow}>
            <Text style={[s.finLabel, { color: tokens.muted }]}>
              {booking.totalDays} dia{booking.totalDays !== 1 ? "s" : ""} × {fmt(booking.dailyPrice)}
            </Text>
            <Text style={[s.finValue, { color: tokens.muted }]}>
              {fmt(booking.dailyPrice * booking.totalDays)}
            </Text>
          </View>
          {/* Desconto (cupom) — fonte: app/reservas/[id]/page.tsx linhas 285-290 */}
          {discountCents > 0 && (
            <View style={s.finRow}>
              <Text style={[s.finLabel, { color: tokens.success }]}>Desconto (cupom)</Text>
              <Text style={[s.finValue, { color: tokens.success }]}>− {fmt(discountCents)}</Text>
            </View>
          )}
          <View style={[s.divider, { backgroundColor: tokens.border }]} />
          <View style={s.finRow}>
            <Text style={[s.finTotalLabel, { color: tokens.text }]}>Total da locação</Text>
            <Text style={[s.finTotalValue, { color: tokens.text }]}>{fmt(booking.totalPrice)}</Text>
          </View>
          {booking.depositAmount != null && booking.depositAmount > 0 && (
            <View style={s.finRow}>
              <Text style={[s.finLabel, { color: tokens.muted }]}>Caução (devolvida)</Text>
              <Text style={[s.finValue, { color: "#B45309" }]}>{fmt(booking.depositAmount)}</Text>
            </View>
          )}
          {/* Repartição — taxa retida do repasse, não somada ao locatário.
              Fonte: app/reservas/[id]/page.tsx linhas 303-313. feeRateBps
              SEMPRE dinâmico (nunca hardcode — regra do CLAUDE.md). */}
          {split && feeRateLabel != null && (
            <View style={[s.splitBox, { backgroundColor: tokens.bg }]}>
              <View style={s.finRow}>
                <Text style={[s.finLabel, { color: tokens.muted }]}>Taxa Shareo ({feeRateLabel}%)</Text>
                <Text style={[s.finValue, { color: "#DC2626" }]}>− {fmt(split.platformFee)}</Text>
              </View>
              <View style={s.finRow}>
                <Text style={[s.finTotalLabel, { color: tokens.text, fontSize: 13 }]}>
                  {isOwner ? "Você recebe" : "Proprietário recebe"}
                </Text>
                <Text style={[s.finTotalValue, { color: tokens.green, fontSize: 13 }]}>{fmt(split.ownerNet)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Taxa de atraso — fonte: app/reservas/[id]/page.tsx linhas 549-561 */}
        {booking.lateFeeAmount != null && booking.lateFeeAmount > 0 && (
          <View style={[s.alertBox, { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⏱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: "#991B1B" }]}>Taxa de atraso aplicada</Text>
              <Text style={[s.alertDesc, { color: "#B91C1C" }]}>
                Item devolvido após o prazo. Taxa adicional: <Text style={{ fontWeight: "700" }}>{fmt(booking.lateFeeAmount)}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Token de retirada — fonte: app/reservas/[id]/page.tsx linhas 348-397 */}
        {/* Exibido: locatário + pagamento confirmado + token presente + não usado */}
        {isBorrower && booking.paymentStatus === "PAID" && booking.pickupToken && !booking.pickupTokenUsedAt && (
          <View style={[s.section, s.pickupCard, { borderColor: tokens.green }]}>
            <Text style={[s.pickupTitle, { color: tokens.green }]}>🔑 Código de retirada</Text>
            <Text style={[s.pickupHint, { color: tokens.muted }]}>
              Apresente este código ao proprietário na retirada
            </Text>
            <View style={[s.pickupCodeBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[s.pickupCode, { color: tokens.navy }]} selectable>
                {booking.pickupToken}
              </Text>
            </View>
            <Text style={[s.pickupNote, { color: tokens.muted }]}>
              O proprietário digitará este código no app para confirmar a entrega. Guarde-o.
            </Text>

            {/* Endereço de retirada — fonte: app/reservas/[id]/page.tsx linhas 371-395 */}
            <View style={[s.pickupAddressBox, { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" }]}>
              <Text style={s.pickupAddressLabel}>📍 Local de retirada (endereço cadastrado do proprietário)</Text>
              {pickupAddress ? (
                <>
                  <Text style={s.pickupAddressValue}>{pickupAddress}</Text>
                  <Text style={s.pickupAddressWarning}>
                    Por segurança, a retirada deve ocorrer exclusivamente neste endereço. Não aceite outro local.
                  </Text>
                </>
              ) : (
                <Text style={s.pickupAddressValue}>
                  O proprietário ainda não cadastrou endereço. Entre em contato pelo chat para combinar o local de retirada.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Aviso de pagamento pago para o locatário (status CONFIRMED + PAID) */}
        {/* Fonte: app/reservas/[id]/page.tsx linhas 414-428 */}
        {isBorrower && booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" && (
          <View style={[s.alertBox, { borderColor: "#6EE7B7", backgroundColor: "#ECFDF5" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: "#065F46" }]}>Pago com sucesso</Text>
              <Text style={[s.alertDesc, { color: "#059669" }]}>
                O locador foi notificado. Apresente o código de retirada acima.
              </Text>
            </View>
          </View>
        )}

        {/* Aviso de devolução em andamento (borrower em RETURNED) */}
        {/* Fonte: app/reservas/[id]/page.tsx linhas 584-595 */}
        {isBorrower && booking.status === "RETURNED" && (
          <View style={[s.alertBox, { borderColor: "#C4B5FD", backgroundColor: "#F5F3FF" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: "#6D28D9" }]}>Devolução em andamento</Text>
              <Text style={[s.alertDesc, { color: "#7C3AED" }]}>
                Você iniciou a devolução. Aguardando o locador confirmar o recebimento do item para concluir a locação.
              </Text>
            </View>
          </View>
        )}

        {/* Aviso do locador aguardando devolução (owner em ACTIVE) */}
        {/* Fonte: app/reservas/[id]/page.tsx linhas 563-575 */}
        {isOwner && booking.status === "ACTIVE" && (
          <View style={[s.alertBox, { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: "#1E40AF" }]}>Aguardando a devolução</Text>
              <Text style={[s.alertDesc, { color: "#2563EB" }]}>
                O locatário ainda está com o item. Quando ele iniciar a devolução, a reserva ficará como{" "}
                <Text style={{ fontWeight: "700" }}>Devolução em andamento</Text>
                {" "}e você poderá confirmar o recebimento aqui.
              </Text>
            </View>
          </View>
        )}

        {/* Motivo do cancelamento — fonte: app/reservas/[id]/page.tsx linhas 324-330 */}
        {booking.cancelReason && (
          <View style={[s.alertBox, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: "#991B1B" }]}>Motivo do cancelamento</Text>
              <Text style={[s.alertDesc, { color: "#B91C1C" }]}>{booking.cancelReason}</Text>
            </View>
          </View>
        )}

        {/* Nota do locatário — fonte: app/reservas/[id]/page.tsx linhas 316-322 */}
        {booking.borrowerNote && (
          <View style={[s.section, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>MENSAGEM DO LOCATÁRIO</Text>
            <Text style={[s.noteText, { color: tokens.text }]}>{booking.borrowerNote}</Text>
          </View>
        )}

        {/* TODO(revisão): componentes maiores do site ainda não portados — cada um
            precisaria de tela/estado próprio, não são "faltando 1 elemento":
            - ReturnCountdown (status ACTIVE) — page.tsx linhas 506-511
            - ContractBanner (assinatura de contrato digital) — linhas 513-525
            - ReturnChecklist (locatário em ACTIVE) — linhas 577-582
            - ReturnConditionForm (locador em RETURNED, substitui o botão simples
              "Confirmar recebimento" por um formulário de estado do item) — linhas 597-602
            - CheckInOut ×2 (fotos retirada/devolução) — linhas 527-547, requer
              câmera/galeria + Supabase Storage
            - ReviewForm ×1-2 (avaliações pós-devolução) — linhas 619-651, requer
              componente de estrelas + textarea
            Documentados como MOB-BL (follow-up), fora do escopo desta rodada. */}

      </ScrollView>

      {/* Bottom actions — fonte: app/reservas/[id]/page.tsx linhas 604-617 + _BookingActions.tsx */}
      <View
        style={[
          s.bottomBar,
          {
            backgroundColor:  tokens.surface,
            borderTopColor:   tokens.border,
            paddingBottom:    insets.bottom + 12,
          },
        ]}
      >
        {/* Pagar reserva (locatário + CONFIRMED + não pago) */}
        {canPay && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: tokens.green }]}
            onPress={() => mpCheckout.mutate()}
            activeOpacity={0.85}
            disabled={mpCheckout.isPending}
            accessibilityRole="button"
            accessibilityLabel="Pagar com Mercado Pago"
            accessibilityState={{ disabled: mpCheckout.isPending }}
          >
            {mpCheckout.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.actionBtnText}>Pagar reserva</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Devolver item (locatário + ACTIVE) */}
        {canReturn && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: tokens.green }]}
            onPress={handleReturn}
            activeOpacity={0.85}
            disabled={returnAction.isPending}
            accessibilityRole="button"
            accessibilityLabel="Devolver item"
            accessibilityState={{ disabled: returnAction.isPending }}
          >
            {returnAction.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.actionBtnText}>📦 Devolver</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Confirmar recebimento (locador + RETURNED) */}
        {canConfirmReturn && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: tokens.green }]}
            onPress={handleConfirmReturn}
            activeOpacity={0.85}
            disabled={returnAction.isPending}
            accessibilityRole="button"
            accessibilityLabel="Confirmar recebimento do item"
            accessibilityState={{ disabled: returnAction.isPending }}
          >
            {returnAction.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={s.actionBtnText}>📦 Confirmar recebimento</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Abrir conversa — fonte: app/reservas/[id]/page.tsx + _BookingActions.tsx */}
        {booking.conversation && (
          <TouchableOpacity
            style={[s.actionBtnOutline, { borderColor: tokens.green }]}
            onPress={() => router.push(`/mensagens/${booking.conversation!.id}`)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir conversa com o proprietário"
          >
            <Text style={[s.actionBtnOutlineText, { color: tokens.green }]}>Abrir conversa</Text>
          </TouchableOpacity>
        )}

        {/* Cancelar reserva (locatário + PENDING ou CONFIRMED) — fonte: _BookingActions.tsx linha 242 */}
        {canCancel && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }]}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={cancel.isPending}
            accessibilityRole="button"
            accessibilityLabel="Cancelar reserva"
            accessibilityState={{ disabled: cancel.isPending }}
          >
            {cancel.isPending ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Text style={[s.actionBtnText, { color: "#dc2626" }]}>Cancelar reserva</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Modal de cancelamento — fonte: _BookingActions.tsx linhas 262-283
          Alert.prompt não existe no Android, portanto Modal + TextInput.
          Botão desabilitado se motivo vazio — mesmo comportamento do site. ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setCancelModalVisible(false); setCancelReason("") }}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: tokens.surface }]}>
            <Text style={[s.modalTitle, { color: tokens.navy }]}>
              Cancelar reserva
            </Text>
            <Text style={[s.modalDesc, { color: tokens.muted }]}>
              Informe o motivo do cancelamento <Text style={{ color: "#DC2626" }}>*</Text>
            </Text>
            <TextInput
              style={[s.reasonInput, {
                color:           tokens.text,
                borderColor:     tokens.border,
                backgroundColor: tokens.bg,
              }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Descreva o motivo..."
              placeholderTextColor={tokens.muted}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              editable={!cancel.isPending}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtnSecondary, { borderColor: tokens.border }]}
                onPress={() => { setCancelModalVisible(false); setCancelReason("") }}
                disabled={cancel.isPending}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <Text style={[s.modalBtnSecondaryText, { color: tokens.text }]}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnDanger, { opacity: !cancelReason.trim() || cancel.isPending ? 0.5 : 1 }]}
                onPress={() => cancel.mutate(cancelReason)}
                disabled={!cancelReason.trim() || cancel.isPending}
                accessibilityRole="button"
                accessibilityLabel="Confirmar cancelamento"
                accessibilityState={{ disabled: !cancelReason.trim() || cancel.isPending }}
              >
                {cancel.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.modalBtnDangerText}>Confirmar cancelamento</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundTitle: { fontSize: 16, fontWeight: "600", marginTop: 12 },

  // Header
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    paddingBottom:    12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },

  // Status badge
  statusBadge: {
    borderRadius: 12,
    borderWidth:  1,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginBottom: 12,
  },
  statusLabel: { fontSize: 14, fontWeight: "700" },
  statusSub:   { fontSize: 12, marginTop: 4 },

  // Seção genérica
  section: {
    borderRadius: 12,
    borderWidth:  1,
    padding:      16,
    marginBottom: 12,
    overflow:     "hidden",
  },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 10 },

  // Histórico
  historyToggle: {
    minHeight:      44,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  historyToggleLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyTitle:  { fontSize: 14, fontWeight: "600" },
  historyCount:  { fontSize: 12 },
  historyChevron:{ fontSize: 16 },
  historyPreview: { borderTopWidth: 1, paddingTop: 10, marginTop: 8 },
  historyPreviewLabel: { fontSize: 11 },
  historyPreviewEvent: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  historyPreviewTime:  { fontSize: 11, marginTop: 1 },
  historyList:   { borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  historyItem:   { flexDirection: "row", gap: 10, marginBottom: 16 },
  historyDotCol: { alignItems: "center", width: 24 },
  historyDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  historyDotCheck: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  historyDotInner: { width: 8, height: 8, borderRadius: 4 },
  historyLine:     { flex: 1, width: 1, marginTop: 3 },
  historyContent:  { flex: 1 },
  historyEventLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  historyEventTime:  { fontSize: 11, marginTop: 2 },
  historyEventActor: { fontSize: 11, marginTop: 2 },

  // Item card
  itemCard: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    backgroundColor: "#FFFFFF",
  },
  itemThumb:      { width: 72, height: 72, borderRadius: 10, overflow: "hidden" },
  itemThumbEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  itemInfo:       { flex: 1 },
  itemTitle:      { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  itemCounterpart:{ fontSize: 12, marginTop: 4 },
  itemChevron:    { fontSize: 22 },

  // Itens desta locação (Story B)
  multiItemRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8,
  },
  multiItemThumb: { width: 36, height: 36, borderRadius: 8, overflow: "hidden" },
  multiItemTitle: { flex: 1, fontSize: 13 },
  multiItemPrice: { fontSize: 13, fontWeight: "600" },

  // Datas
  datesRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  dateSubLabel: { fontSize: 11, marginBottom: 3 },
  dateValue:    { fontSize: 14, fontWeight: "600" },
  dateSep:      { fontSize: 16, fontWeight: "600" },
  dateCaption:  { fontSize: 10, marginTop: 2 },

  // Valores
  finRow:       { flexDirection: "row", justifyContent: "space-between", marginVertical: 3 },
  finLabel:     { fontSize: 13 },
  finValue:     { fontSize: 13, fontWeight: "600" },
  finTotalLabel: { fontSize: 15, fontWeight: "700" },
  finTotalValue: { fontSize: 15, fontWeight: "700" },
  divider:      { height: 1, marginVertical: 10 },
  splitBox: {
    marginTop: 10, borderRadius: 10, padding: 10, gap: 2,
  },

  // Token de retirada
  pickupCard: {
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  pickupTitle:   { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  pickupHint:    { fontSize: 11, marginBottom: 10 },
  pickupCodeBox: {
    alignItems:   "center",
    borderRadius: 12,
    borderWidth:  1,
    paddingVertical:   16,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  pickupCode: {
    fontSize:      36,
    fontWeight:    "900",
    letterSpacing: 8,
  },
  pickupNote: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  pickupAddressBox: {
    marginTop: 12, borderRadius: 10, borderWidth: 1, padding: 12,
  },
  pickupAddressLabel: { fontSize: 11, fontWeight: "700", color: "#92400E", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  pickupAddressValue: { fontSize: 13, fontWeight: "500", color: "#78350F" },
  pickupAddressWarning: { fontSize: 10, color: "#B45309", marginTop: 4 },

  // Alertas de status
  alertBox: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             8,
    borderRadius:    12,
    borderWidth:     1,
    padding:         14,
    marginBottom:    12,
  },
  alertTitle: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  alertDesc:  { fontSize: 12, marginTop: 3, lineHeight: 16 },

  // Nota
  noteText: { fontSize: 13, lineHeight: 20 },

  // Bottom actions
  bottomBar: {
    borderTopWidth:    1,
    paddingTop:        12,
    paddingHorizontal: 16,
    gap:               10,
  },
  actionBtn: {
    minHeight:       52,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
  },
  actionBtnText:        { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  actionBtnOutline: {
    minHeight:         44,
    borderRadius:      12,
    borderWidth:       1,
    alignItems:        "center",
    justifyContent:    "center",
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: "700" },

  // Modal de cancelamento — fonte: _BookingActions.tsx linhas 262-283
  modalOverlay: {
    flex:             1,
    backgroundColor:  "rgba(0,0,0,0.5)",
    justifyContent:   "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
    padding:              20,
    gap:                  12,
  },
  modalTitle:   { fontSize: 17, fontWeight: "700" },
  modalDesc:    { fontSize: 13, lineHeight: 18 },
  reasonInput: {
    borderWidth:  1,
    borderRadius: 10,
    padding:      12,
    fontSize:     14,
    minHeight:    80,
  },
  modalActions: {
    flexDirection: "row",
    gap:           10,
    marginTop:     4,
  },
  modalBtnSecondary: {
    flex:            1,
    minHeight:       48,
    borderRadius:    12,
    borderWidth:     1,
    alignItems:      "center",
    justifyContent:  "center",
  },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: "600" },
  modalBtnDanger: {
    flex:           1,
    minHeight:      48,
    borderRadius:   12,
    backgroundColor:"#DC2626",
    alignItems:     "center",
    justifyContent: "center",
  },
  modalBtnDangerText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
})
