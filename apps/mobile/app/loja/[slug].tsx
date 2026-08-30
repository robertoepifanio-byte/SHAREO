// Fonte: app/loja/[slug]/page.tsx
// Vitrine pública de um anunciante (PF ou PJ). Transcrição literal do site
// em 375px — layout, textos e hierarquia visual verbatim.

import React from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { SafeAreaView } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"
import { Avatar } from "@/components/ui/Avatar"
import { Stars } from "@/components/ui/Stars"
import { ItemCard, type ItemCardItem } from "@/components/items/ItemCard"
import { EmptyState } from "@/components/ui/EmptyState"

// ── Tipos ─────────────────────────────────────────────────────────────────────
// Espelha o select de GET /api/loja/[slug] — sem dados sensíveis.

interface LojaOwner {
  id:         string
  name:       string
  slug:       string | null
  bio:        string | null
  avatarUrl:  string | null
  city:       string | null
  state:      string | null
  userType:   string
  isVerified: boolean
  createdAt:  string
  _count: {
    items:           number
    reviewsReceived: number
  }
}

interface LojaResponse {
  data: {
    owner:       LojaOwner
    items:       ItemCardItem[]
    avgRating:   number | null
    reviewCount: number
  }
}

// ── Helper de data ────────────────────────────────────────────────────────────
// Fonte: utils/format.ts formatMonthYear — "julho de 2024"
// Formatter no escopo do módulo: locale/opções são fixos, e construir um
// Intl.DateTimeFormat novo a cada chamada é a parte cara (resolução de locale
// + compilação do padrão) — só o .format() precisa rodar por data.
const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })

function formatMonthYear(iso: string): string {
  try {
    return monthYearFormatter.format(new Date(iso))
  } catch {
    return ""
  }
}

// ── Cabeçalho com botão voltar ─────────────────────────────────────────────
// Fonte: AppHeader.tsx — botão "← Voltar" padrão do app. Extraído como
// componente próprio (usado nos 3 estados da tela: loading, erro, conteúdo) —
// uma JSX guardada em `const` no corpo do componente não tem identidade
// estável de reconciliação e é recriada a cada render.
function LojaHeader({ tokens }: { tokens: ReturnType<typeof useTheme>["tokens"] }) {
  return (
    <View style={[s.topBar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={s.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Text style={[s.backText, { color: tokens.navy }]}>← Voltar</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function LojaScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { tokens } = useTheme()

  const { data, isLoading, isError, refetch } = useQuery<LojaResponse>({
    queryKey:  ["loja", slug],
    queryFn:   () => apiFetch<LojaResponse>(`/api/loja/${slug}`),
    enabled:   !!slug,
    staleTime: 60_000, // 1 min
  })

  const owner = data?.data.owner
  const items = data?.data.items ?? []
  const avg   = data?.data.avgRating
  const count = data?.data.reviewCount ?? 0

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: tokens.bg }]} edges={["top"]}>
        <LojaHeader tokens={tokens} />
        <View style={s.centered}>
          <ActivityIndicator color={tokens.green} accessibilityLabel="Carregando vitrine" />
        </View>
      </SafeAreaView>
    )
  }

  // ── Erro / não encontrado ──────────────────────────────────────────────────
  if (isError || !owner) {
    return (
      <SafeAreaView style={[s.flex, { backgroundColor: tokens.bg }]} edges={["top"]}>
        <LojaHeader tokens={tokens} />
        <View style={s.centered}>
          <EmptyState
            title="Vitrine não encontrada"
            description="Esta vitrine não existe ou foi removida."
            action={{ label: "Tentar novamente", onPress: () => void refetch() }}
          />
        </View>
      </SafeAreaView>
    )
  }

  // ── Location string — "📍 Cidade, UF" — verbatim do site ─────────────────
  const location = [owner.city, owner.state].filter(Boolean).join(", ")

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: tokens.bg }]} edges={["top"]}>
      <LojaHeader tokens={tokens} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Banner / Cabeçalho da vitrine ── */}
        {/* Fonte: page.tsx linhas 102-165 — border-b border-border bg-surface */}
        <View style={[s.banner, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>

          {/* Avatar xl = 88px — ring-2 ring-border verbatim do site */}
          <Avatar name={owner.name} imageUrl={owner.avatarUrl} size="xl" />

          {/* Info */}
          <View style={s.info}>
            {/* Nome + badges */}
            <View style={s.nameRow}>
              <Text style={[s.name, { color: tokens.navy }]}>{owner.name}</Text>

              {/* "✓ Verificado" — page.tsx linha 116-119 */}
              {owner.isVerified && (
                <View style={[s.badge, { backgroundColor: tokens.success + "1A" }]}>
                  <Text style={[s.badgeText, { color: tokens.success }]}>✓ Verificado</Text>
                </View>
              )}

              {/* "Loja" — page.tsx linha 120-124, só aparece para PJ */}
              {owner.userType === "PJ" && (
                <View style={[s.badge, { backgroundColor: tokens.green + "1A" }]}>
                  <Text style={[s.badgeText, { color: tokens.green }]}>Loja</Text>
                </View>
              )}
            </View>

            {/* Localização + data de cadastro — page.tsx linhas 127-132 */}
            <View style={s.metaRow}>
              {location && (
                <Text style={[s.meta, { color: tokens.muted }]}>
                  {"📍 "}{location}
                </Text>
              )}
              <Text style={[s.meta, { color: tokens.muted }]}>
                Membro desde {formatMonthYear(owner.createdAt)}
              </Text>
            </View>

            {/* Bio — page.tsx linhas 134-138 */}
            {owner.bio && (
              <Text style={[s.bio, { color: tokens.text }]}>{owner.bio}</Text>
            )}

            {/* Stats — page.tsx linhas 141-153 */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: tokens.navy }]}>{owner._count.items}</Text>
                <Text style={[s.statLabel, { color: tokens.muted }]}>
                  {owner._count.items === 1 ? "item" : "itens"}
                </Text>
              </View>
              {avg != null && (
                <View style={s.statItem}>
                  <Stars rating={avg} size={16} />
                  <Text style={[s.statLabel, { color: tokens.muted }]}>
                    {avg.toFixed(1)} ({count})
                  </Text>
                </View>
              )}
            </View>

            {/* "Ver perfil" — page.tsx linhas 157-163 */}
            <TouchableOpacity
              style={[s.profileBtn, { borderColor: tokens.border }]}
              onPress={() => router.push(`/perfil/${owner.id}`)}
              accessibilityRole="link"
              accessibilityLabel="Ver perfil"
            >
              <Text style={[s.profileBtnText, { color: tokens.text }]}>Ver perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Grid de itens ── */}
        {/* Fonte: page.tsx linhas 168-186 */}
        <View style={s.itemsSection}>
          {items.length === 0 ? (
            <EmptyState
              title="Nenhum item disponível"
              description={`${owner.name} ainda não tem itens ativos no momento.`}
            />
          ) : (
            <>
              {/* "N item(s) disponível(is)" — page.tsx linhas 176-178
                  Template literal garante um único nó de texto (sem split RNTL). */}
              <Text style={[s.itemsTitle, { color: tokens.text }]}>
                {`${items.length} ${items.length === 1 ? "item disponível" : "itens disponíveis"}`}
              </Text>

              {/* Grid 2 colunas — handoff breakpoint 375px = 2 cols */}
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={s.gridRow}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={s.gridCell}>
                    <ItemCard item={item} onPress={() => router.push(`/itens/${item.id}`)} />
                  </View>
                )}
              />
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
// Transcrição dos tokens Tailwind do site para StyleSheet:
//   container py-8 → paddingVertical: 32
//   gap-5 → gap: 20 (banner)
//   text-2xl font-bold → fontSize:22 fontWeight:"700"
//   text-sm text-muted-foreground → fontSize:13 color:tokens.muted

const s = StyleSheet.create({
  flex:       { flex: 1 },
  scroll:     { paddingBottom: 32 },
  centered:   { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  // Barra superior com botão voltar
  topBar: {
    flexDirection:    "row",
    alignItems:       "center",
    paddingHorizontal: 16,
    paddingVertical:  12,
    borderBottomWidth: 1,
  },
  backBtn:  { minHeight: 44, minWidth: 44, justifyContent: "center" },
  backText: { fontSize: 15, fontWeight: "600" },

  // Banner — equivalente ao border-b bg-surface do site
  banner: {
    padding:           16,
    borderBottomWidth: 1,
    gap:               16,
  },

  // Info
  info:    { gap: 8 },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  name:    { fontSize: 22, fontWeight: "700" },

  // Badges — rounded-full px-2.5 py-0.5 text-xs font-semibold
  badge:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  meta:    { fontSize: 13 },

  bio: { fontSize: 13, lineHeight: 20 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statValue:{ fontSize: 18, fontWeight: "700" },
  statLabel:{ fontSize: 11 },

  // "Ver perfil" — h-11 border border-border rounded-lg px-4
  profileBtn: {
    alignSelf:        "flex-start",
    flexDirection:    "row",
    alignItems:       "center",
    height:           44,          // min tap-target 44px (WCAG)
    paddingHorizontal: 16,
    borderWidth:      1,
    borderRadius:     8,
    marginTop:        4,
  },
  profileBtnText: { fontSize: 14, fontWeight: "600" },

  // Seção de itens
  itemsSection: { padding: 16, gap: 12 },
  itemsTitle:   { fontSize: 15, fontWeight: "600" },

  // Grid — 2 colunas com gap-3 (12px)
  gridRow:  { gap: 12, marginBottom: 12 },
  gridCell: { flex: 1 },
})
