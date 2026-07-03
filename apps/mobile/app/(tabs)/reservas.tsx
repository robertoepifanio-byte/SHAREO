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
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// Fonte: app/reservas/page.tsx — type Tab
type Tab = "borrower" | "owner"

interface Booking {
  id:         string
  status:     string
  startDate:  string
  endDate:    string
  totalDays:  number
  totalPrice: number
  item: { id: string; title: string; images: { url: string }[] }
  owner:    { id: string; name: string }
  borrower: { id: string; name: string }
  conversation: { id: string } | null
}

interface BookingsResponse {
  data: Booking[]
  meta: { total: number; page: number; limit: number; hasMore: boolean }
}

// Mapeamento de status — fonte: BookingStatusBadge.tsx do site
// Verbatim das cores do handoff §1.5
const STATUS: Record<string, { label: string; bgColor: string; textColor: string }> = {
  PENDING:   { label: "Aguardando aprovação",    bgColor: "#FEF3C7", textColor: "#92400E" },
  CONFIRMED: { label: "Confirmada",              bgColor: "#D1FAE5", textColor: "#065F46" },
  ACTIVE:    { label: "Em andamento",            bgColor: "#EFF6FF", textColor: "#1E40AF" },
  RETURNED:  { label: "Devolução em andamento",  bgColor: "#F5F3FF", textColor: "#6D28D9" },
  COMPLETED: { label: "Concluída",               bgColor: "#D1FAE5", textColor: "#065F46" },
  CANCELLED: { label: "Cancelada",               bgColor: "#F1F5F9", textColor: "#64748B" },
  DISPUTED:  { label: "Em disputa",              bgColor: "#FEE2E2", textColor: "#991B1B" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

export default function ReservasScreen() {
  const { tokens } = useTheme()
  const user = useAuth((s) => s.user)
  // Tab ativa — fonte: app/reservas/page.tsx type Tab
  const [tab, setTab] = useState<Tab>("borrower")

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
            <View style={s.pendingBanner} accessibilityRole="alert">
              <Text style={s.pendingBannerIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pendingBannerTitle}>
                  {pendingCount === 1
                    ? "Você tem 1 solicitação aguardando sua aprovação"
                    : `Você tem ${pendingCount} solicitações aguardando sua aprovação`}
                </Text>
                <Text style={s.pendingBannerDesc}>
                  Confirme ou recuse cada solicitação para liberar o período no calendário.
                </Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item: b }) => {
          const st = STATUS[b.status] ?? { label: b.status, bgColor: "#F1F5F9", textColor: "#64748B" }
          // CTA primário contextual por status + papel — fonte: app/reservas/page.tsx linhas 177-194
          const isOwner    = b.owner.id    === user.id
          const isBorrower = b.borrower.id === user.id
          let primaryLabel = "Ver detalhes"
          if (isBorrower && b.status === "ACTIVE")    primaryLabel = "📦 Devolver"
          else if (isOwner && b.status === "PENDING") primaryLabel = "✅ Aprovar solicitação"
          else if (isOwner && b.status === "RETURNED") primaryLabel = "📦 Confirmar recebimento"
          else if (b.status === "CONFIRMED")          primaryLabel = "💳 Ver pagamento"
          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              onPress={() => router.push(`/reservas/${b.id}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${b.item.title}, ${st.label}`}
            >
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: tokens.navy }]} numberOfLines={2}>
                  {b.item.title}
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

              {/* Ações */}
              <View style={s.actions}>
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
