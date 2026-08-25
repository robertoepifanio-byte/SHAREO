// Fonte: app/meus-anuncios/desempenho/page.tsx
//
// Transcrição literal da tela "Desempenho dos Anúncios" do site ShareO para
// React Native. Exige autenticação — é o painel do próprio anunciante.
//
// Decisões de transcrição documentadas:
//   1. Abas: rótulos e ordem verbatim (Anúncios / Desempenho / Importar só PJ /
//      Integrações). "Desempenho" = ativa (esta tela). "Anúncios" → router.back().
//      "Integrações" → router.push("/meus-anuncios/integracoes").
//      "Importar" → Linking.openURL (somente PJ, ainda sem tela nativa).
//   2. PjGate: a API retorna 403 com code PJ_REQUIRED para não-PJ. Adicionalmente,
//      verifica userType via ["me-profile"] (cache compartilhado) para exibir a
//      mensagem de gate antes de disparar a query de desempenho.
//      Texto verbatim de components/premium/PjGate.tsx feature="analytics".
//   3. Formatação de preço (centavos → R$): inlineada localmente — o utils/format.ts
//      do site é web-only; o padrão mobile é reusar Intl.NumberFormat inline
//      (ver dashboard.tsx linha 73, meus-anuncios.tsx linha 79, ganhar.tsx linha 43).
//   4. Cards de totais (Visualizações / Reservas concluídas / Receita total /
//      Nota média): verbatim de page.tsx linhas 182-203. Accent em Receita (verde).
//   5. Lista "Por anúncio": verbatim da versão mobile do site (linhas 292-360) —
//      card empilhado com thumbnail + título + status + grid 2 col de métricas.
//   6. Status do item: "Ativo" (AVAILABLE) / "Pausado" (qualquer outro) — verbatim.
//   7. Empty state: textos verbatim de page.tsx linhas 169-177.
//   8. Nota: "X.X ★" com star amarela — mesmo padrão da página web.
//   9. SafeAreaView de react-native-safe-area-context, ScrollView para a lista.
//  10. apiFetch de @/lib/api; useAuth de @/lib/auth; useTheme de @/lib/theme.

import React from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Image,
} from "react-native"
import Svg, { Line, Rect } from "react-native-svg"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { apiFetch, API_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Helpers de formatação (equivalentes a utils/format.ts — inlineados pois
//    o módulo Node.js do site não é consumível diretamente pelo Metro bundler) ─

function formatPrice(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  )
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n)
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface DesempenhoItem {
  id:             string
  title:          string
  status:         string
  viewCount:      number
  favoritesCount: number
  bookingsCount:  number
  revenue:        number
  avgRating:      number | null
  ratingsCount:   number
  imageUrl:       string | null
}

interface Totals {
  views:        number
  bookings:     number
  revenue:      number
  avgRating:    number | null
  ratingsCount: number
}

interface DesempenhoResponse {
  data: {
    totals: Totals
    items:  DesempenhoItem[]
  }
}

interface MeData {
  id:       string
  userType: "PF" | "PJ"
}

// ── Ícone placeholder (verbatim do site — SVG inline) ──────────────────────────

function ImagePlaceholder({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
    </Svg>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────

export default function DesempenhoScreen() {
  const { tokens } = useTheme()
  const user = useAuth((s: { user: { id: string } | null }) => s.user)

  // ── Query de userType — cache compartilhado com meus-anuncios.tsx ────────────
  const { data: meData, isLoading: meLoading } = useQuery<{ data: MeData }>({
    queryKey: ["me-profile"],
    queryFn:  () => apiFetch<{ data: MeData }>("/api/users/me"),
    enabled:  !!user,
    staleTime: 5 * 60 * 1000,
  })

  const isPJ = meData?.data?.userType === "PJ"

  // ── Query de desempenho — só dispara para PJ autenticado ─────────────────────
  const { data, isLoading: desempenhoLoading, error } = useQuery<DesempenhoResponse>({
    queryKey: ["desempenho-anuncios"],
    queryFn:  () => apiFetch<DesempenhoResponse>("/api/meus-anuncios/desempenho"),
    enabled:  !!user && isPJ === true,
  })

  const isLoading = meLoading || (isPJ === true && desempenhoLoading && !data)

  // ── Estado: não autenticado ───────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: tokens.bg }]}>
        {/* Tab bar */}
        <TabBar tokens={tokens} isPJ={false} />
        <View style={s.center}>
          <Text style={[s.emptyTitle, { color: tokens.text }]}>Sessão expirada</Text>
          <TouchableOpacity
            style={[s.loginBtn, { backgroundColor: tokens.green }]}
            onPress={() => router.push("/(auth)/login")}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
          >
            <Text style={s.loginBtnText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Estado: carregando ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: tokens.bg }]}>
        <TabBar tokens={tokens} isPJ={isPJ} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      </SafeAreaView>
    )
  }

  // ── Estado: gate PJ (verbatim de PjGate.tsx feature="analytics") ─────────────
  if (!isPJ) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: tokens.bg }]}>
        <TabBar tokens={tokens} isPJ={false} />
        <ScrollView contentContainerStyle={s.scrollContent}>
          <View style={[s.gateCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[s.gateTitle, { color: tokens.navy }]}>
              Analytics exclusivo para contas PJ
            </Text>
            <Text style={[s.gateDesc, { color: tokens.muted }]}>
              Acompanhe visualizações, reservas e receita de cada anúncio em tempo real. Disponível para Pessoas Jurídicas.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const totals = data?.data?.totals
  const items  = data?.data?.items ?? []

  return (
    <SafeAreaView style={[s.root, { backgroundColor: tokens.bg }]}>
      {/* ── Tab bar ── */}
      <TabBar tokens={tokens} isPJ={isPJ} />

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* ── Header com contador (verbatim de page.tsx linhas 116-119) ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.pageTitle, { color: tokens.navy }]}>Meus Anúncios</Text>
            {items.length > 0 && (
              <Text style={[s.pageSubtitle, { color: tokens.muted }]}>
                {items.length} {items.length === 1 ? "anúncio" : "anúncios"}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.newBtn, { backgroundColor: tokens.green }]}
            onPress={() => router.push("/itens/novo")}
            accessibilityRole="button"
            accessibilityLabel="Novo anúncio"
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5}>
              <Line x1="12" y1="5" x2="12" y2="19" />
              <Line x1="5" y1="12" x2="19" y2="12" />
            </Svg>
            <Text style={s.newBtnText}>Novo anúncio</Text>
          </TouchableOpacity>
        </View>

        {/* ── Erro de rede ── */}
        {error && (
          <Text style={[s.errorBanner, { backgroundColor: tokens.error + "1A", color: tokens.error }]}>
            Erro ao carregar métricas.
          </Text>
        )}

        {items.length === 0 ? (
          /* ── Empty state (verbatim de page.tsx linhas 169-177) ── */
          <View style={s.emptyContainer}>
            <Text style={[s.emptyTitle, { color: tokens.text }]}>Nenhum anúncio ainda</Text>
            <Text style={[s.emptyDesc, { color: tokens.muted }]}>
              Crie seu primeiro anúncio para ver as métricas aqui.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/itens/novo")}
              accessibilityRole="link"
              accessibilityLabel="Criar anúncio"
            >
              <Text style={[s.emptyLink, { color: tokens.green }]}>Criar anúncio →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Cards de totais (verbatim de page.tsx linhas 181-203) ── */}
            <View style={s.statsGrid}>
              <StatCard
                label="Visualizações"
                value={formatNumber(totals?.views ?? 0)}
                sub="total acumulado"
                tokens={tokens}
              />
              <StatCard
                label="Reservas concluídas"
                value={formatNumber(totals?.bookings ?? 0)}
                sub="devolvidas ou finalizadas"
                tokens={tokens}
              />
              <StatCard
                label="Receita total"
                value={formatPrice(totals?.revenue ?? 0)}
                sub="locações finalizadas"
                accent
                tokens={tokens}
              />
              <StatCard
                label="Nota média"
                value={
                  totals?.avgRating != null
                    ? `${totals.avgRating.toFixed(1)} ★`
                    : "—"
                }
                sub={
                  totals?.avgRating != null
                    ? `${totals.ratingsCount} avaliações`
                    : "sem avaliações"
                }
                tokens={tokens}
              />
            </View>

            {/* ── Seção "Por anúncio" (verbatim de page.tsx linhas 207-360) ── */}
            <View style={[s.byItemCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <View style={[s.byItemHeader, { borderBottomColor: tokens.border }]}>
                <Text style={[s.byItemTitle, { color: tokens.text }]}>Por anúncio</Text>
              </View>

              {items.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    s.itemRow,
                    idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border },
                  ]}
                >
                  {/* Thumbnail + título + status */}
                  <View style={s.itemTop}>
                    <View style={[s.thumbnail, { backgroundColor: tokens.border }]}>
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={s.thumbnailImg}
                          accessibilityLabel=""
                        />
                      ) : (
                        <ImagePlaceholder color={tokens.muted} />
                      )}
                    </View>
                    <View style={s.itemInfo}>
                      <Text
                        style={[s.itemTitle, { color: tokens.text }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          s.itemStatus,
                          { color: item.status === "AVAILABLE" ? tokens.success : tokens.muted },
                        ]}
                      >
                        {item.status === "AVAILABLE" ? "Ativo" : "Pausado"}
                      </Text>
                    </View>
                  </View>

                  {/* Grid de métricas 2 colunas (verbatim de page.tsx linhas 328-357) */}
                  <View style={s.metricsGrid}>
                    <MetricCell label="Views" value={formatNumber(item.viewCount)} tokens={tokens} />
                    <MetricCell label="Favoritos" value={formatNumber(item.favoritesCount)} tokens={tokens} />
                    <MetricCell label="Reservas" value={String(item.bookingsCount)} tokens={tokens} />
                    <MetricCell
                      label="Receita"
                      value={item.revenue > 0 ? formatPrice(item.revenue) : "—"}
                      tokens={tokens}
                    />
                    {item.avgRating !== null && (
                      <View style={[s.metricCellWide, { backgroundColor: tokens.bg }]}>
                        <Text style={[s.metricLabel, { color: tokens.muted }]}>Nota média</Text>
                        <Text style={[s.metricValue, { color: tokens.text }]}>
                          {item.avgRating.toFixed(1)}{" "}
                          <Text style={{ color: "#F59E0B" }}>★</Text>
                          {"  "}
                          <Text style={[s.metricSub, { color: tokens.muted }]}>
                            ({item.ratingsCount})
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── StatCard (verbatim de page.tsx linhas 14-34) ──────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
  tokens,
}: {
  label:   string
  value:   string
  sub?:    string
  accent?: boolean
  tokens:  ReturnType<typeof import("@/lib/theme").useTheme>["tokens"]
}) {
  return (
    <View style={[statCardStyles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <Text style={[statCardStyles.value, { color: accent ? tokens.green : tokens.navy }]}>
        {value}
      </Text>
      <Text style={[statCardStyles.label, { color: tokens.text }]}>{label}</Text>
      {sub && <Text style={[statCardStyles.sub, { color: tokens.muted }]}>{sub}</Text>}
    </View>
  )
}

const statCardStyles = StyleSheet.create({
  card:  { borderWidth: 1, borderRadius: 12, padding: 16, flex: 1, minWidth: "45%" as never },
  value: { fontSize: 22, fontWeight: "800" },
  label: { marginTop: 2, fontSize: 13, fontWeight: "600" },
  sub:   { marginTop: 2, fontSize: 11 },
})

// ── MetricCell (verbatim de page.tsx mobile — grade 2 col) ────────────────────

function MetricCell({
  label,
  value,
  tokens,
}: {
  label:  string
  value:  string
  tokens: ReturnType<typeof import("@/lib/theme").useTheme>["tokens"]
}) {
  return (
    <View style={[metricStyles.cell, { backgroundColor: tokens.bg }]}>
      <Text style={[metricStyles.label, { color: tokens.muted }]}>{label}</Text>
      <Text style={[metricStyles.value, { color: tokens.text }]}>{value}</Text>
    </View>
  )
}

const metricStyles = StyleSheet.create({
  cell:  { flex: 1, borderRadius: 8, padding: 10, minWidth: "45%" as never },
  label: { fontSize: 11 },
  value: { fontWeight: "600", fontSize: 13, marginTop: 2 },
})

// ── TabBar (verbatim de meus-anuncios.tsx e integracoes.tsx) ──────────────────

function TabBar({
  tokens,
  isPJ,
}: {
  tokens: ReturnType<typeof import("@/lib/theme").useTheme>["tokens"]
  isPJ:   boolean
}) {
  return (
    <View
      style={[tabStyles.bar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
      accessibilityRole="tablist"
    >
      {/* "Anúncios" → voltar */}
      <TouchableOpacity
        style={tabStyles.inactive}
        onPress={() => router.back()}
        accessibilityRole="tab"
        accessibilityState={{ selected: false }}
        accessibilityLabel="Anúncios"
      >
        <Text style={[tabStyles.inactiveText, { color: tokens.muted }]}>Anúncios</Text>
      </TouchableOpacity>

      {/* "Desempenho" — aba ativa */}
      <View
        style={[tabStyles.active, { backgroundColor: tokens.green }]}
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
        accessibilityLabel="Desempenho"
      >
        <Text style={tabStyles.activeText}>Desempenho</Text>
      </View>

      {/* "Importar" — somente PJ, ainda sem tela nativa */}
      {isPJ && (
        <TouchableOpacity
          style={tabStyles.inactive}
          onPress={() => Linking.openURL(`${API_URL}/meus-anuncios/importar`)}
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel="Importar"
        >
          <Text style={[tabStyles.inactiveText, { color: tokens.muted }]}>Importar</Text>
        </TouchableOpacity>
      )}

      {/* "Integrações" → tela nativa */}
      <TouchableOpacity
        style={tabStyles.inactive}
        onPress={() => router.push("/meus-anuncios/integracoes")}
        accessibilityRole="tab"
        accessibilityState={{ selected: false }}
        accessibilityLabel="Integrações"
      >
        <Text style={[tabStyles.inactiveText, { color: tokens.muted }]}>Integrações</Text>
      </TouchableOpacity>
    </View>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection:     "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    gap:               4,
  },
  inactive: {
    paddingHorizontal: 12,
    paddingVertical:   10,
    minHeight:         44,
    justifyContent:    "center",
    alignItems:        "center",
  },
  inactiveText: { fontSize: 13, fontWeight: "600" },
  active: {
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderRadius:      6,
    minHeight:         44,
    justifyContent:    "center",
    alignItems:        "center",
    alignSelf:         "center",
    marginVertical:    4,
  },
  activeText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
})

// ── Estilos ───────────────────────────────────────────────────────────────────

// `tokens` não é usado aqui — nenhum valor de cor depende de tema, então o
// StyleSheet fica no escopo do módulo, padrão de todas as outras telas
// (StyleSheet.create é feito para rodar 1x; recriá-lo por render perde a
// otimização nativa de pré-processamento do RN).
const s = StyleSheet.create({
    root:        { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },
    center:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

    // Header
    header:      { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    pageTitle:   { fontSize: 22, fontWeight: "700" },
    pageSubtitle:{ fontSize: 13, marginTop: 2 },
    newBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minHeight: 44 },
    newBtnText:  { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },

    // Error
    errorBanner: { borderRadius: 8, padding: 12, fontSize: 13 },

    // Stats grid
    statsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 12 },

    // By item
    byItemCard:   { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
    byItemHeader: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
    byItemTitle:  { fontSize: 14, fontWeight: "600" },
    itemRow:      { padding: 16, gap: 12 },
    itemTop:      { flexDirection: "row", alignItems: "center", gap: 12 },
    thumbnail:    { width: 40, height: 40, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    thumbnailImg: { width: 40, height: 40 },
    itemInfo:     { flex: 1, minWidth: 0 },
    itemTitle:    { fontSize: 14, fontWeight: "500" },
    itemStatus:   { fontSize: 11, marginTop: 2 },
    metricsGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metricCellWide: { width: "100%", borderRadius: 8, padding: 10 },
    metricLabel:  { fontSize: 11 },
    metricValue:  { fontWeight: "600", fontSize: 13, marginTop: 2 },
    metricSub:    { fontSize: 11, fontWeight: "400" },

    // Gate
    gateCard:  { borderWidth: 1, borderRadius: 12, padding: 20, gap: 8 },
    gateTitle: { fontSize: 17, fontWeight: "700" },
    gateDesc:  { fontSize: 13, lineHeight: 20 },

    // Empty
    emptyContainer: { alignItems: "center", paddingVertical: 48, gap: 8 },
    emptyTitle:     { fontSize: 16, fontWeight: "600" },
    emptyDesc:      { fontSize: 13, textAlign: "center" },
    emptyLink:      { fontSize: 13, fontWeight: "500", textDecorationLine: "underline" },

    // Login
    loginBtn:     { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, minHeight: 44 },
    loginBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
})
