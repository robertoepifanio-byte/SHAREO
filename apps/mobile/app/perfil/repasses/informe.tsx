// Fonte: app/perfil/repasses/informe/page.tsx

/**
 * InformeRendimentosScreen — apps/mobile/app/perfil/repasses/informe.tsx
 *
 * Tela nativa de informe anual de rendimentos (para declaração de Imposto de Renda).
 * Transcrição literal de app/perfil/repasses/informe/page.tsx (Server Component do site).
 *
 * Fonte de dados: GET /api/user/informe-rendimentos?year= (rota existente em main).
 * Seletor de ano (2024 → ano atual), card de total, aviso IR verbatim, lista de repasses.
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path, Polyline, Line } from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Tipos — espelho do response de /api/user/informe-rendimentos ──────────────
interface PayoutItem {
  id:          string
  amount:      number
  amountBrl:   string
  processedAt: string | null
  item:        string
  bookingId:   string
  period:      string
}

interface InformeResponse {
  year:           number
  totalPaidCents: number
  totalPaidBrl:   string
  payoutCount:    number
  account:        { holderName: string | null; pixKey: string | null; pixKeyType: string | null } | null
  payouts:        PayoutItem[]
}

// ── Formatadores verbatim de app/perfil/repasses/informe/page.tsx ─────────────
const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d))

// ── Ícone de seta — verbatim do site (Chevron left, ← Meus Repasses) ─────────
function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  )
}

// ── Ícone de arquivo-texto — para o header ────────────────────────────────────
function FileTextIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1="16" y1="13" x2="8" y2="13" />
      <Line x1="16" y1="17" x2="8" y2="17" />
      <Polyline points="10 9 9 9 8 9" />
    </Svg>
  )
}

// ── Lista de anos disponíveis — verbatim de page.tsx linhas 63-66 ─────────────
function buildYears(): number[] {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: currentYear - 2024 + 1 }, (_, i) => currentYear - i)
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function InformeRendimentosScreen() {
  const { tokens, mode } = useTheme()
  const insets          = useSafeAreaInsets()
  const user            = useAuth((s) => s.user)
  const years           = buildYears()
  const [year, setYear] = useState(years[0])

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["informe-rendimentos", year],
    queryFn:  () => apiFetch<InformeResponse>(`/api/user/informe-rendimentos?year=${year}`),
    enabled:  !!user,
  })

  // ── Guard: não logado ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg, paddingTop: insets.top }]}>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para acessar o informe
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const total      = data?.totalPaidCents ?? 0
  const payouts    = data?.payouts        ?? []
  const account    = data?.account        ?? null

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* ── Header — back link verbatim de page.tsx linha 74 ── */}
      <View
        style={[
          s.headerBar,
          { paddingTop: insets.top, backgroundColor: tokens.surface, borderBottomColor: tokens.border },
        ]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Meus Repasses"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft color={tokens.muted} />
          <Text style={[s.backText, { color: tokens.muted }]}>Meus Repasses</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
        }
      >
        {/* ── Título + Seletor de ano — verbatim de page.tsx linhas 83-111 ── */}
        <View style={s.titleRow}>
          <View style={s.titleTextCol}>
            <View style={s.titleWithIcon}>
              <FileTextIcon color={tokens.navy} />
              <Text style={[s.title, { color: tokens.navy }]}>Informe de Rendimentos</Text>
            </View>
            <Text style={[s.subtitle, { color: tokens.muted }]}>
              Valores recebidos via repasse ShareO — use para declaração do Imposto de Renda.
            </Text>
          </View>
        </View>

        {/* Seletor de ano — verbatim de page.tsx linhas 92-111 (select + botão Ver) */}
        <View style={s.yearRow}>
          <Text style={[s.yearLabel, { color: tokens.muted }]}>Ano</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.yearChips}
            accessibilityLabel="Seletor de ano"
          >
            {years.map((y) => {
              const selected = y === year
              return (
                <TouchableOpacity
                  key={y}
                  style={[
                    s.yearChip,
                    selected
                      ? { backgroundColor: tokens.navy, borderColor: tokens.navy }
                      : { backgroundColor: tokens.surface, borderColor: tokens.border },
                  ]}
                  onPress={() => setYear(y)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Ano ${y}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[s.yearChipText, { color: selected ? "#FFFFFF" : tokens.text }]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* ── Loading ────────────────────────────────────────────────────────── */}
        {isLoading && (
          <ActivityIndicator
            style={s.loader}
            color={tokens.navy}
            accessibilityLabel="Carregando informe"
          />
        )}

        {/* ── Erro ───────────────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <View style={[s.emptyCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.emptyText, { color: tokens.muted }]}>
              Não foi possível carregar o informe.
            </Text>
            <TouchableOpacity
              style={[s.retryBtn, { backgroundColor: tokens.navy }]}
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
            >
              <Text style={s.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Card de totais — verbatim de page.tsx linhas 115-128 ────────────── */}
        {!isLoading && !isError && (
          <>
            <View style={[s.totalCard, { backgroundColor: tokens.surface, borderColor: `${tokens.navy}33` }]}>
              <Text style={[s.totalLabel, { color: tokens.muted }]}>
                Total recebido em {year}
              </Text>
              <Text style={[s.totalAmount, { color: tokens.navy }]}>{fmt(total)}</Text>
              <Text style={[s.totalCount, { color: tokens.muted }]}>
                {payouts.length} repasse{payouts.length !== 1 ? "s" : ""} concluído{payouts.length !== 1 ? "s" : ""}
              </Text>
              {account?.pixKey && (
                <Text style={[s.totalAccount, { color: tokens.muted }]}>
                  Titular: {account.holderName} · {account.pixKeyType}: {account.pixKey}
                </Text>
              )}
            </View>

            {/* ── Aviso IR — verbatim de page.tsx linhas 131-137 ── */}
            {/* tint: amarelo claro → ternário para dark (instrução dark-mode-activation) */}
            <View style={[s.warningCard, {
              borderColor:     mode === "dark" ? "#78550A" : "#fef08a",
              backgroundColor: mode === "dark" ? "#1F1A0A" : "#fefce8",
            }]}>
              <Text style={[s.warningTitle, { color: mode === "dark" ? "#FDE68A" : "#854d0e" }]}>
                Declaracao de Imposto de Renda
              </Text>
              <Text style={[s.warningText, { color: mode === "dark" ? "#FDE68A" : "#854d0e" }]}>
                Rendimentos de locacao devem ser declarados na ficha{" "}
                <Text style={s.warningBold}>
                  Rendimentos Tributaveis Recebidos de Pessoa Juridica
                </Text>
                {" "}(CNPJ da ShareO) ou como{" "}
                <Text style={s.warningBold}>Rendimentos de Alugueis</Text>, dependendo
                da sua situacao. Consulte seu contador.
              </Text>
            </View>

            {/* ── Tabela de repasses — verbatim de page.tsx linhas 140-177 ─── */}
            {payouts.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <Text style={[s.emptyText, { color: tokens.muted }]}>
                  Nenhum repasse recebido em {year}.
                </Text>
              </View>
            ) : (
              <View style={[s.listCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                {/* Header da lista */}
                <View style={[s.listHeader, { borderBottomColor: tokens.border }]}>
                  <Text style={[s.listHeaderText, { color: tokens.text }]}>
                    Detalhamento — {year}
                  </Text>
                </View>

                {/* Itens */}
                {payouts.map((p, i) => (
                  <View
                    key={p.id}
                    style={[
                      s.payoutRow,
                      i < payouts.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: tokens.border }
                        : undefined,
                    ]}
                  >
                    <View style={s.payoutLeft}>
                      <Text style={[s.payoutItemTitle, { color: tokens.text }]} numberOfLines={1}>
                        {p.item}
                      </Text>
                      <Text style={[s.payoutMeta, { color: tokens.muted }]}>
                        Locacao: {p.period}
                      </Text>
                      {p.processedAt && (
                        <Text style={[s.payoutMeta, { color: tokens.muted }]}>
                          Recebido em: {fmtDate(p.processedAt)}
                        </Text>
                      )}
                    </View>
                    <View style={s.payoutRight}>
                      <Text style={[s.payoutAmount, { color: tokens.text }]}>
                        {fmt(p.amount)}
                      </Text>
                      <Text style={[s.payoutIndex, { color: tokens.muted }]}>
                        #{i + 1}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Rodapé com total */}
                <View style={[s.listFooter, { borderTopColor: tokens.border, backgroundColor: `${tokens.border}60` }]}>
                  <Text style={[s.listFooterLabel, { color: tokens.text }]}>Total</Text>
                  <Text style={[s.listFooterTotal, { color: tokens.navy }]}>{fmt(total)}</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:  { flex: 1 },
  scroll: { flex: 1 },

  // Guard
  center: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               16,
  },
  gateTitle: {
    fontSize:   16,
    fontWeight: "600",
    textAlign:  "center",
  },
  loginBtn: {
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
    width:             "100%",
  },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Header bar com back link
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom:     12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    minHeight:      44,
    alignSelf:      "flex-start",
  },
  backText: {
    fontSize:   13,
  },

  // Content padding
  content: {
    paddingHorizontal: 16,
    paddingTop:        20,
    gap:               16,
  },

  // Título + subtitle
  titleRow: {
    gap: 4,
  },
  titleTextCol: { gap: 4 },
  titleWithIcon: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
  },
  title: {
    fontSize:   18,
    fontWeight: "700",
    fontFamily: "Montserrat_700Bold",
    flexShrink: 1,
  },
  subtitle: {
    fontSize:   13,
    lineHeight: 18,
    marginTop:  2,
  },

  // Seletor de ano
  yearRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  yearLabel: { fontSize: 13 },
  yearChips: { gap: 8, flexDirection: "row" },
  yearChip: {
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 14,
    paddingVertical:   7,
    minHeight:         36,
    justifyContent:    "center",
  },
  yearChipText: { fontSize: 13, fontWeight: "600" },

  // Loading
  loader: { marginVertical: 32 },

  // Total card — verbatim de page.tsx linhas 115-128
  totalCard: {
    borderWidth:  2,
    borderRadius: 16,
    padding:      20,
    gap:          4,
  },
  totalLabel:   { fontSize: 13, fontWeight: "500" },
  totalAmount:  { fontSize: 28, fontWeight: "800", marginTop: 2 },
  totalCount:   { fontSize: 11 },
  totalAccount: { fontSize: 11, marginTop: 4 },

  // Aviso IR — verbatim de page.tsx linhas 131-137
  warningCard: {
    borderWidth:  1,
    borderRadius: 16,
    padding:      16,
    gap:          4,
  },
  warningTitle: { fontSize: 13, fontWeight: "700" },
  warningText:  { fontSize: 12, lineHeight: 17 },
  warningBold:  { fontWeight: "700" },

  // Lista de repasses — verbatim de page.tsx linhas 140-177
  listCard: {
    borderWidth:  1,
    borderRadius: 16,
    overflow:     "hidden",
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: 1,
  },
  listHeaderText: { fontSize: 13, fontWeight: "600" },
  payoutRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 20,
    paddingVertical:   14,
    gap:               12,
    minHeight:         60,
  },
  payoutLeft:      { flex: 1, minWidth: 0, gap: 2 },
  payoutItemTitle: { fontSize: 13, fontWeight: "600" },
  payoutMeta:      { fontSize: 11 },
  payoutRight:     { alignItems: "flex-end", flexShrink: 0, gap: 2 },
  payoutAmount:    { fontSize: 14, fontWeight: "700" },
  payoutIndex:     { fontSize: 11 },
  listFooter: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 20,
    paddingVertical:   12,
    borderTopWidth:    1,
  },
  listFooterLabel: { fontSize: 13, fontWeight: "600" },
  listFooterTotal: { fontSize: 13, fontWeight: "800" },

  // Empty state
  emptyCard: {
    borderWidth:  1,
    borderRadius: 16,
    padding:      32,
    alignItems:   "center",
    gap:          12,
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  retryBtn: {
    borderRadius:      10,
    paddingHorizontal: 20,
    paddingVertical:   10,
    minHeight:         44,
    justifyContent:    "center",
    alignItems:        "center",
  },
  retryBtnText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
})
