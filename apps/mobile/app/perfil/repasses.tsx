// Fonte: app/perfil/repasses/page.tsx

/**
 * RepassesScreen — apps/mobile/app/perfil/repasses.tsx
 *
 * Tela nativa de histórico de repasses (payouts) recebidos pelo locador.
 * Transcrição literal de app/perfil/repasses/page.tsx (Server Component do site).
 *
 * Fonte de dados: GET /api/user/payouts (rota nova — mesma query Prisma do site).
 * Links para /perfil/recebimentos e /perfil/repasses/informe navegam
 * nativamente (telas existem; corrigido na revisão s41 — antes abriam o
 * navegador por engano).
 *
 * Revisão s41 (dark mode): reescrita de NativeWind `className` (cores hex fixas
 * de light no tailwind.config, não reagem ao ThemeContext → dark mode quebrado)
 * para StyleSheet + useTheme(), como as ~35 outras telas. Badges/paletas de
 * status ficam em hex fixo (light-only), igual ao BookingStatusBadge do site.
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ─── Labels + cores de status verbatim do site ──────────────────────────────
// Fonte: app/perfil/repasses/page.tsx — STATUS_LABEL. Paleta Tailwind fixa
// (light-only, igual ao site, que não tem variantes dark nesses badges).
const STATUS_LABEL: Record<string, { label: string; border: string; bg: string; text: string }> = {
  PENDING:    { label: "Aguardando",  border: "#FEF08A", bg: "#FEFCE8", text: "#A16207" }, // yellow
  PROCESSING: { label: "Em processo", border: "#BFDBFE", bg: "#EFF6FF", text: "#1D4ED8" }, // blue
  COMPLETED:  { label: "Pago",        border: "#BBF7D0", bg: "#F0FDF4", text: "#15803D" }, // green
  FAILED:     { label: "Falhou",      border: "#FECACA", bg: "#FEF2F2", text: "#DC2626" }, // red
  BLOCKED:    { label: "Bloqueado",   border: "#E2E8F0", bg: "#F8FAFC", text: "#64748B" }, // neutro
}

// Formatadores idênticos aos do site
const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d))

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PayoutAccount {
  id:          string
  pixKey:      string | null
  pixKeyType:  string | null
  holderName:  string | null
  status:      string
}

interface Payout {
  id:            string
  amount:        number
  status:        string
  eligibleAfter: string | null
  processedAt:   string | null
  failureReason: string | null
  booking: {
    id:        string
    startDate: string
    endDate:   string
    item:      { title: string }
  }
}

interface PayoutsResponse {
  data: {
    account: PayoutAccount | null
    payouts: Payout[]
  }
}

// Cores fixas (light-only, paridade com o site) da faixa de status da conta PIX.
function pixCardColors(status: string): { border: string; bg: string; text: string } {
  if (status === "VERIFIED") return { border: "#BBF7D0", bg: "#F0FDF4", text: "#15803D" }
  if (status === "REJECTED") return { border: "#FECACA", bg: "#FEF2F2", text: "#DC2626" }
  return { border: "#FEF08A", bg: "#FEFCE8", text: "#A16207" }
}

// ─── Tela ────────────────────────────────────────────────────────────────────

export default function RepassesScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)
  const { tokens } = useTheme()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["user-payouts"],
    queryFn:  () => apiFetch<PayoutsResponse>("/api/user/payouts"),
    enabled:  !!user,
  })

  const account = data?.data?.account ?? null
  const payouts = data?.data?.payouts ?? []

  const totalPaid    = payouts.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0)
  const totalPending = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0)
  const countPaid    = payouts.filter((p) => p.status === "COMPLETED").length
  const countPending = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length

  if (!user) {
    return (
      <View style={[s.gate, { backgroundColor: tokens.bg, paddingTop: insets.top }]}>
        <Text style={s.gateEmoji}>💸</Text>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para ver seus repasses
        </Text>
        <TouchableOpacity
          style={[s.gateBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.gateBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* Header */}
      <View
        style={[
          s.header,
          { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + 8 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backIcon, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Meus Repasses</Text>
        {/* Informe IR — tela nativa existe (achado revisão s41: abria o
            navegador mesmo com informe.tsx nativo pronto) */}
        <TouchableOpacity
          onPress={() => router.push("/perfil/repasses/informe")}
          accessibilityLabel="Informe de Rendimentos IR"
          accessibilityRole="button"
          style={s.informeBtn}
        >
          <Text style={[s.informeText, { color: tokens.text }]}>📄 Informe IR</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : (
        <ScrollView
          style={s.flex1}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={tokens.green} />
          }
        >
          {/* Descrição verbatim do site */}
          <Text style={[s.desc, { color: tokens.muted }]}>
            Histórico de repasses das suas locações. O valor fica retido na plataforma até o repasse semanal (toda segunda-feira).
          </Text>

          {/* Conta PIX cadastrada — verbatim do site */}
          {account?.pixKey ? (
            (() => {
              const c = pixCardColors(account.status)
              return (
                <View style={[s.card, { borderColor: c.border, backgroundColor: c.bg }]}>
                  <Text style={[s.pixStatusText, { color: c.text }]}>
                    {account.status === "VERIFIED"
                      ? "✓ Conta PIX verificada"
                      : account.status === "REJECTED"
                      ? "✗ Conta PIX rejeitada"
                      : "⏳ Conta PIX aguardando verificação"}
                  </Text>
                  <Text style={[s.pixSub, { color: tokens.muted }]}>
                    {account.pixKeyType}: {account.pixKey} · {account.holderName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/perfil/recebimentos")}
                    accessibilityRole="link"
                    accessibilityLabel="Editar conta PIX"
                    style={s.linkBtn}
                  >
                    <Text style={[s.editLink, { color: tokens.success }]}>Editar conta →</Text>
                  </TouchableOpacity>
                </View>
              )
            })()
          ) : (
            <View style={[s.card, { borderColor: "#FEF08A", backgroundColor: "#FEFCE8" }]}>
              <Text style={s.pixCadastreTitle}>
                Cadastre sua chave PIX para receber repasses
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/perfil/recebimentos")}
                accessibilityRole="link"
                accessibilityLabel="Cadastrar chave PIX"
                style={s.linkBtn}
              >
                <Text style={s.pixCadastreLink}>Cadastrar chave PIX →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Resumo (só aparece com repasses — verbatim do site) */}
          {payouts.length > 0 && (
            <View style={s.summaryRow}>
              <View style={[s.summaryCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <Text style={[s.summaryValue, { color: tokens.success }]}>{fmt(totalPaid)}</Text>
                <Text style={[s.summaryLabel, { color: tokens.text }]}>Total recebido</Text>
                <Text style={[s.summarySub, { color: tokens.muted }]}>
                  {countPaid} {countPaid === 1 ? "repasse" : "repasses"}
                </Text>
              </View>
              <View style={[s.summaryCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
                <Text style={[s.summaryValue, { color: tokens.navy }]}>{fmt(totalPending)}</Text>
                <Text style={[s.summaryLabel, { color: tokens.text }]}>A receber</Text>
                <Text style={[s.summarySub, { color: tokens.muted }]}>
                  {countPending} {countPending === 1 ? "pendente" : "pendentes"}
                </Text>
              </View>
            </View>
          )}

          {/* Lista / Estado vazio — verbatim do site */}
          {payouts.length === 0 ? (
            <View style={[s.emptyCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
              <Text style={[s.emptyText, { color: tokens.muted }]}>
                Nenhum repasse ainda. Complete uma locação para receber.
              </Text>
            </View>
          ) : (
            <View style={[s.list, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
              {payouts.map((p, i) => {
                const info = STATUS_LABEL[p.status] ?? STATUS_LABEL["BLOCKED"]
                return (
                  <View
                    key={p.id}
                    style={[
                      s.listItem,
                      i < payouts.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border },
                    ]}
                  >
                    <View style={s.listItemRow}>
                      {/* Dados do repasse */}
                      <View style={s.listItemInfo}>
                        <Text style={[s.itemTitle, { color: tokens.text }]} numberOfLines={1}>
                          {p.booking.item.title}
                        </Text>
                        <Text style={[s.itemMeta, { color: tokens.muted }]}>
                          {fmtDate(p.booking.startDate)} – {fmtDate(p.booking.endDate)}
                        </Text>
                        {p.status === "PENDING" && p.eligibleAfter && (
                          <Text style={[s.itemMeta, { color: tokens.muted }]}>
                            Disponível em {fmtDate(p.eligibleAfter)}
                          </Text>
                        )}
                        {p.processedAt && (
                          <Text style={[s.itemMeta, { color: tokens.muted }]}>
                            Pago em {fmtDate(p.processedAt)}
                          </Text>
                        )}
                        {p.failureReason && (
                          <Text style={[s.itemMeta, { color: "#DC2626" }]}>{p.failureReason}</Text>
                        )}
                      </View>

                      {/* Valor + badge de status */}
                      <View style={s.listItemRight}>
                        <Text style={[s.itemValue, { color: tokens.text }]}>{fmt(p.amount)}</Text>
                        <View style={[s.badge, { borderColor: info.border, backgroundColor: info.bg }]}>
                          <Text style={[s.badgeText, { color: info.text }]}>{info.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root:  { flex: 1 },
  flex1: { flex: 1 },

  // Gate (deslogado)
  gate:        { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  gateEmoji:   { fontSize: 48 },
  gateTitle:   { marginTop: 12, fontSize: 16, fontWeight: "600", textAlign: "center" },
  gateBtn:     { marginTop: 24, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, minHeight: 44, justifyContent: "center" },
  gateBtnText: { fontWeight: "700", color: "#FFFFFF" },

  // Header
  header:      { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn:     { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  backIcon:    { fontSize: 28, fontWeight: "700", lineHeight: 30 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  informeBtn:  { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  informeText: { fontSize: 14, fontWeight: "500" },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  desc: { marginBottom: 16, fontSize: 14 },

  // Cards genéricos (PIX)
  card:            { marginBottom: 16, borderRadius: 12, borderWidth: 1, padding: 16 },
  pixStatusText:   { fontSize: 14, fontWeight: "600" },
  pixSub:          { marginTop: 2, fontSize: 14 },
  linkBtn:         { minHeight: 44, justifyContent: "center" },
  editLink:        { fontSize: 12, textDecorationLine: "underline" },
  pixCadastreTitle:{ fontSize: 14, fontWeight: "600", color: "#854D0E" },
  pixCadastreLink: { fontSize: 14, color: "#A16207", textDecorationLine: "underline" },

  // Resumo
  summaryRow:   { marginBottom: 16, flexDirection: "row", gap: 12 },
  summaryCard:  { flex: 1, borderRadius: 12, borderWidth: 1, padding: 16 },
  summaryValue: { fontSize: 24, fontWeight: "700" },
  summaryLabel: { marginTop: 2, fontSize: 14, fontWeight: "500" },
  summarySub:   { marginTop: 2, fontSize: 12 },

  // Estado vazio
  emptyCard: { alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 32 },
  emptyText: { textAlign: "center", fontSize: 14 },

  // Lista
  list:          { overflow: "hidden", borderRadius: 12, borderWidth: 1 },
  listItem:      { paddingHorizontal: 20, paddingVertical: 16 },
  listItemRow:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  listItemInfo:  { flex: 1, minWidth: 0 },
  itemTitle:     { fontSize: 14, fontWeight: "600" },
  itemMeta:      { fontSize: 12 },
  listItemRight: { alignItems: "flex-end", gap: 6 },
  itemValue:     { fontSize: 18, fontWeight: "700" },
  badge:         { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText:     { fontSize: 12, fontWeight: "600" },
})
