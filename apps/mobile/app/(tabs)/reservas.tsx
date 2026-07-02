// Fonte: app/(tabs)/reservas.tsx (lógica existente) + protótipo mobile-app-prototipo-v1.html (frame Reservas)
// Histórico de reservas com Badge de status e empty state com texto exato da spec.
// Empty state: "Nenhuma reserva ainda" / "Explore itens disponíveis e faça sua primeira reserva."
// / link "Explorar anúncios →" (texto verbatim da spec Lote 2).

import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

interface Booking {
  id:        string
  status:    string
  startDate: string
  endDate:   string
  totalPrice: number
  item: { id: string; title: string; images: { url: string }[] }
  owner:     { name: string }
  borrower:  { name: string }
}

// Mapeamento de status — transcrito de Badge.tsx/BookingStatusBadge do handoff §1.5
const STATUS: Record<string, { label: string; bgColor: string; textColor: string }> = {
  PENDING:   { label: "Aguardando aprovação", bgColor: "#FEF3C7", textColor: "#92400E" },
  ACTIVE:    { label: "Em andamento",          bgColor: "#EFF6FF", textColor: "#1E40AF" },
  COMPLETED: { label: "Concluída",             bgColor: "#D1FAE5", textColor: "#065F46" },
  CANCELLED: { label: "Cancelada",             bgColor: "#F1F5F9", textColor: "#64748B" },
  DISPUTED:  { label: "Em disputa",            bgColor: "#FEE2E2", textColor: "#991B1B" },
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

export default function ReservasScreen() {
  const { tokens } = useTheme()
  const user = useAuth((s) => s.user)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn:  () => apiFetch<{ data: Booking[] }>("/api/bookings"),
    enabled:  !!user,
  })

  const bookings = data?.data ?? []

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
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />
        }
        renderItem={({ item: b }) => {
          const st = STATUS[b.status] ?? { label: b.status, bgColor: "#F1F5F9", textColor: "#64748B" }
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
                {/* Badge de status — transcrito de handoff §1.5 */}
                <View style={[s.badge, { backgroundColor: st.bgColor }]}>
                  <Text style={[s.badgeText, { color: st.textColor }]}>{st.label}</Text>
                </View>
              </View>

              <Text style={[s.dates, { color: tokens.muted }]}>
                {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
              </Text>

              <Text style={[s.price, { color: tokens.text }]}>
                {fmt(b.totalPrice)}
              </Text>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          // Empty state — texto VERBATIM da spec Lote 2
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={[s.emptyTitle, { color: tokens.navy }]}>Nenhuma reserva ainda</Text>
            <Text style={[s.emptyDesc, { color: tokens.muted }]}>
              Explore itens disponíveis e faça sua primeira reserva.
            </Text>
            {/* Link "Explorar anúncios →" — texto verbatim da spec */}
            <TouchableOpacity
              onPress={() => router.push("/explorar")}
              style={s.emptyLink}
              accessibilityRole="link"
            >
              <Text style={s.emptyLinkText}>Explorar anúncios →</Text>
            </TouchableOpacity>
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
  gateIcon: {
    fontSize:     40,
    marginBottom: 12,
  },
  gateTitle: {
    fontSize:     15,
    fontWeight:   "600",
    textAlign:    "center",
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor:   "#007B3C",
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
  },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  listContent: {
    padding:      16,
    paddingBottom: 24,
  },
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
  cardTitle: {
    flex:       1,
    fontSize:   14,
    fontWeight: "700",
  },
  badge: {
    borderRadius:      20,
    paddingHorizontal: 8,
    paddingVertical:   3,
    flexShrink:        0,
  },
  badgeText: {
    fontSize:   11,
    fontWeight: "600",
  },
  dates: {
    fontSize:     12,
    marginBottom:  8,
  },
  price: {
    fontSize:   16,
    fontFamily: "Montserrat_700Bold",
  },
  empty: {
    alignItems:        "center",
    paddingVertical:   64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize:     48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize:     16,
    fontWeight:   "600",
    textAlign:    "center",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize:     13,
    textAlign:    "center",
    lineHeight:   19,
    marginBottom: 20,
  },
  emptyLink: {
    paddingVertical: 8,
  },
  emptyLinkText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#007B3C",
  },
})
