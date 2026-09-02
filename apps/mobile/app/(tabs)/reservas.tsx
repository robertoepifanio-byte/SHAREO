// Fonte: app/reservas/page.tsx
// Lista de reservas com tabs "Como locatário" / "Como locador" (verbatim do site),
// banner de solicitações pendentes para locador, empty states por tab e CTAs por status.
// StyleSheet + tokens (useTheme).

import { useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Image } from "expo-image"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// Fonte: app/reservas/page.tsx — type Tab
type Tab = "borrower" | "owner"

interface Booking {
  id:         string
  status:     string
  paymentStatus: string
  startDate:  string
  endDate:    string
  totalDays:  number
  totalPrice: number
  item: { id: string; title: string; images: { url: string }[] }
  owner:    { id: string; name: string }
  borrower: { id: string; name: string }
  conversation: { id: string } | null
  _count: { bookingItems: number; reviews: number }
}

interface BookingsResponse {
  data: Booking[]
  meta: { total: number; page: number; limit: number; hasMore: boolean }
}

// Mapeamento de status — fonte: BookingStatusBadge.tsx do site
// Verbatim das cores do handoff §1.5 para o modo claro.
// Tints dark: backgrounds escurecidos e texto claro para contraste adequado.
function getStatusConfig(mode: "light" | "dark"): Record<string, { label: string; bgColor: string; textColor: string }> {
  const d = mode === "dark"
  return {
    PENDING:   { label: "Aguardando aprovação",    bgColor: d ? "#3B2A0E" : "#FEF3C7", textColor: d ? "#FBBF77" : "#92400E" },
    CONFIRMED: { label: "Confirmada",              bgColor: d ? "#0D2E1E" : "#D1FAE5", textColor: d ? "#5BD08B" : "#065F46" },
    ACTIVE:    { label: "Em andamento",            bgColor: d ? "#0D1E3B" : "#EFF6FF", textColor: d ? "#7EB5F5" : "#1E40AF" },
    RETURNED:  { label: "Devolução em andamento",  bgColor: d ? "#1E0D3B" : "#F5F3FF", textColor: d ? "#B89CF5" : "#6D28D9" },
    COMPLETED: { label: "Concluída",               bgColor: d ? "#0D2E1E" : "#D1FAE5", textColor: d ? "#5BD08B" : "#065F46" },
    CANCELLED: { label: "Cancelada",               bgColor: d ? "#1A2333" : "#F1F5F9", textColor: d ? "#94A3B8" : "#64748B" },
    DISPUTED:  { label: "Em disputa",              bgColor: d ? "#2C1515" : "#FEE2E2", textColor: d ? "#F08C84" : "#991B1B" },
  }
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

export default function ReservasScreen() {
  const { tokens, mode } = useTheme()
  const user = useAuth((s) => s.user)
  // Tab ativa — fonte: app/reservas/page.tsx type Tab
  const [tab, setTab] = useState<Tab>("borrower")
  const statusConfig = getStatusConfig(mode)

  // Busca reservas por role — parâmetro "role" que a API aceita (ListBookingsQuerySchema)
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["bookings", tab],
    queryFn:  () => apiFetch<BookingsResponse>(`/api/bookings?role=${tab}`),
    enabled:  !!user,
  })

  const bookings = data?.data ?? []

  // Contagem de solicitações pendentes do locador (equivalente ao pendingCount do site)
  const pendingCount = tab === "owner"
    ? bookings.filter((b) => b.status === "PENDING").length
    : 0

  // ── Não logado ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={s.gateIcon}>🔒</Text>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para ver suas reservas
        </Text>
        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: tokens.bg }]}>
      {/* Abas — fonte: app/reservas/page.tsx linhas 71-90 (rótulos verbatim) */}
      <View style={[s.tabsBar, { backgroundColor: tokens.bg, borderBottomColor: tokens.border }]}>
        {(["borrower", "owner"] as Tab[]).map((t) => {
          const label = t === "borrower" ? "Como locatário" : "Como locador"
          const active = tab === t
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={[
                s.tab,
                active
                  ? { backgroundColor: "#007B3C" }
                  : { backgroundColor: tokens.surface },
                { borderColor: tokens.border },
              ]}
            >
              <Text
                style={[
                  s.tabText,
                  { color: active ? "#FFFFFF" : tokens.muted },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />
        }
        ListHeaderComponent={
          // Banner de pendentes — só aparece na aba "Como locador" com solicitações pendentes
          // Fonte: app/reservas/page.tsx linhas 92-107 (copy verbatim)
          tab === "owner" && pendingCount > 0 ? (
            // tint âmbar: dark usa fundos escuros e texto claro
            <View style={[s.pendingBanner, {
              backgroundColor: mode === "dark" ? "#2A2000" : "#FFFBEB",
              borderColor:     mode === "dark" ? "#7C5C00" : "#FCD34D",
            }]} accessibilityRole="alert">
              <Text style={s.pendingBannerIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.pendingBannerTitle, { color: mode === "dark" ? "#FBBF77" : "#92400E" }]}>
                  {pendingCount === 1
                    ? "Você tem 1 solicitação aguardando sua aprovação"
                    : `Você tem ${pendingCount} solicitações aguardando sua aprovação`}
                </Text>
                <Text style={[s.pendingBannerDesc, { color: mode === "dark" ? "#D97706" : "#B45309" }]}>
                  Confirme ou recuse cada solicitação para liberar o período no calendário.
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item: b }) => {
          const st = statusConfig[b.status] ?? {
            label: b.status,
            bgColor:   mode === "dark" ? "#1A2333" : "#F1F5F9",
            textColor: mode === "dark" ? "#94A3B8" : "#64748B",
          }
          // CTA primário contextual por status + papel — fonte: app/reservas/page.tsx linhas 177-194
          const isOwner    = b.owner.id    === user.id
          const isBorrower = b.borrower.id === user.id
          let primaryLabel = "Ver detalhes"
          if (isBorrower && b.status === "ACTIVE")    primaryLabel = "📦 Devolver"
          else if (isOwner && b.status === "PENDING") primaryLabel = "✅ Aprovar solicitação"
          else if (isOwner && b.status === "RETURNED") primaryLabel = "📦 Confirmar recebimento"
          else if (b.status === "CONFIRMED" && b.paymentStatus !== "PAID") primaryLabel = "💳 Ver pagamento"
          // 🪤 Pago e confirmado, o verde continuava "Ver pagamento" e levava a
          // uma tela sem acao. O que falta ao locatario e o codigo de retirada.
          else if (b.status === "CONFIRMED" && isBorrower) primaryLabel = "🔑 Ver código de retirada"
          // CTA "Avaliar" — fonte: app/reservas/page.tsx linha 196
          const canReview = (b.status === "RETURNED" || b.status === "COMPLETED") && b._count.reviews === 0
          const extraItems = b._count.bookingItems - 1
          const thumb = b.item.images[0]?.url
          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              onPress={() => router.push(`/reservas/${b.id}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${b.item.title}, ${st.label}`}
            >
              <View style={s.cardTop}>
                {/* Thumbnail — fonte: app/reservas/page.tsx linhas 134-145 */}
                <View style={[s.thumb, { backgroundColor: tokens.bg }]}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  ) : (
                    <Text style={{ fontSize: 24 }}>📦</Text>
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.cardHeader}>
                    <Text style={[s.cardTitle, { color: tokens.navy }]} numberOfLines={2}>
                      {b.item.title}
                      {/* "+N itens" — Story B, locação multi-item do mesmo dono */}
                      {extraItems > 0 && (
                        <Text style={{ fontWeight: "400", color: tokens.muted }}>
                          {" "}+ {extraItems} {extraItems === 1 ? "item" : "itens"}
                        </Text>
                      )}
                    </Text>
                    {/* Badge de status */}
                    <View style={[s.badge, { backgroundColor: st.bgColor }]}>
                      <Text style={[s.badgeText, { color: st.textColor }]}>{st.label}</Text>
                    </View>
                  </View>

                  {/* Contraparte — fonte: app/reservas/page.tsx linhas 162-165 */}
                  <Text style={[s.counterpart, { color: tokens.muted }]}>
                    {tab === "borrower" ? "Proprietário" : "Locatário"}:{" "}
                    <Text style={[s.counterpartName, { color: tokens.text }]}>
                      {tab === "borrower" ? b.owner.name : b.borrower.name}
                    </Text>
                  </Text>

                  {/* Datas — fonte: app/reservas/page.tsx linha 169 */}
                  <Text style={[s.dates, { color: tokens.muted }]}>
                    📅 {fmtDate(b.startDate)} → {fmtDate(b.endDate)}{" "}
                    · {b.totalDays} dia{b.totalDays !== 1 ? "s" : ""}{" "}
                    · <Text style={{ fontWeight: "700", color: tokens.text }}>{fmt(b.totalPrice)}</Text>
                  </Text>
                </View>
              </View>

              {/* Ações */}
              <View style={[s.actions, { borderTopColor: tokens.border }]}>
                {/* CTA primário */}
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    primaryLabel !== "Ver detalhes"
                      ? { backgroundColor: "#007B3C" }
                      : { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 },
                  ]}
                  onPress={() => router.push(`/reservas/${b.id}`)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      s.actionBtnText,
                      { color: primaryLabel !== "Ver detalhes" ? "#FFFFFF" : tokens.text },
                    ]}
                  >
                    {primaryLabel}
                  </Text>
                </TouchableOpacity>

                {/* "Ver detalhes" secundário quando o primário já é uma ação */}
                {primaryLabel !== "Ver detalhes" && (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }]}
                    onPress={() => router.push(`/reservas/${b.id}`)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <Text style={[s.actionBtnText, { color: tokens.text }]}>Ver detalhes</Text>
                  </TouchableOpacity>
                )}

                {/* Avaliar — fonte: app/reservas/page.tsx linhas 215-223. O site usa
                    um link de âncora #avaliar (scroll até o formulário na mesma
                    página); RN não tem âncora de URL — navega pra tela de detalhe
                    (TODO(revisão): se reservas/[id].tsx tiver seção de avaliação,
                    fazer scroll/foco nela ao chegar via este botão). */}
                {canReview && (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: tokens.surface, borderColor: "#007B3C", borderWidth: 1 }]}
                    onPress={() => router.push(`/reservas/${b.id}` as never)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <Text style={[s.actionBtnText, { color: "#007B3C" }]}>⭐ Avaliar</Text>
                  </TouchableOpacity>
                )}

                {/* Chat — fonte: app/reservas/page.tsx linhas 224-230 */}
                {b.conversation && (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }]}
                    onPress={() => router.push(`/mensagens/${b.conversation!.id}`)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <Text style={[s.actionBtnText, { color: tokens.text }]}>💬 Mensagens</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          // Empty state — fonte: app/reservas/page.tsx linhas 109-124 (copy verbatim por tab)
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={[s.emptyTitle, { color: tokens.navy }]}>Nenhuma reserva ainda</Text>
            <Text style={[s.emptyDesc, { color: tokens.muted }]}>
              {tab === "borrower"
                ? "Explore itens disponíveis e faça sua primeira reserva."
                : "Quando alguém solicitar um item seu, aparecerá aqui."}
            </Text>
            {/* Link "Explorar anúncios →" só na aba de locatário */}
            {tab === "borrower" && (
              <TouchableOpacity
                onPress={() => router.push("/explorar")}
                style={s.emptyLink}
                accessibilityRole="link"
              >
                <Text style={s.emptyLinkText}>Explorar anúncios →</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
  },
  gateIcon:    { fontSize: 40, marginBottom: 12 },
  gateTitle:   { fontSize: 15, fontWeight: "600", textAlign: "center", marginBottom: 20 },
  loginBtn: {
    backgroundColor:   "#007B3C",
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
  },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Abas
  tabsBar: {
    flexDirection:    "row",
    gap:              8,
    paddingHorizontal: 16,
    paddingVertical:  12,
    borderBottomWidth: 1,
  },
  tab: {
    flex:              1,
    minHeight:         44,
    borderRadius:      8,
    borderWidth:       1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingVertical:   10,
    paddingHorizontal: 8,
  },
  tabText: { fontSize: 13, fontWeight: "600" },

  // Banner de pendentes
  pendingBanner: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    gap:            10,
    borderRadius:   12,
    borderWidth:    1,
    borderColor:    "#FCD34D",
    backgroundColor: "#FFFBEB",
    padding:        14,
    marginBottom:   12,
  },
  pendingBannerIcon:  { fontSize: 18, marginTop: 1 },
  pendingBannerTitle: { fontSize: 13, fontWeight: "600", color: "#92400E", lineHeight: 18 },
  pendingBannerDesc:  { fontSize: 12, color: "#B45309", marginTop: 3, lineHeight: 16 },

  listContent: { padding: 16, paddingBottom: 24 },

  card: {
    borderRadius:  16,
    borderWidth:   1,
    padding:       16,
    marginBottom:  12,
  },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 6 },
  thumb: {
    width: 64, height: 64, borderRadius: 10, overflow: "hidden",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardHeader: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    gap:            8,
    marginBottom:   6,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  badge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
    flexShrink:        0,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  counterpart:     { fontSize: 12, marginBottom: 6 },
  counterpartName: { fontWeight: "600" },
  dates:           { fontSize: 12, marginBottom: 12 },

  // Ações
  actions: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop:    12,
  },
  actionBtn: {
    borderRadius:      8,
    minHeight:         44,
    paddingHorizontal: 12,
    alignItems:        "center",
    justifyContent:    "center",
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },

  // Empty state
  empty: {
    alignItems:        "center",
    paddingVertical:   64,
    paddingHorizontal: 32,
  },
  emptyIcon:     { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 8 },
  emptyDesc:     { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  emptyLink:     { paddingVertical: 8 },
  emptyLinkText: { fontSize: 14, fontWeight: "600", color: "#007B3C" },
})
