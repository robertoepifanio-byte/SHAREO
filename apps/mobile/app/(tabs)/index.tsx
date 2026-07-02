// Fonte: app/page.tsx (hero section linhas 137–252) + components/home/HeroSearch.tsx
// Transcrição literal do hero do site mobile (375px) para React Native.
// H1, subtítulo, dual CTA, barra de busca e 4 stats transcritos verbatim.
// Stats: dados da API pública /api/stats (se disponível) — senão omitidos conforme spec.

import { useState, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import Svg, { Circle, Path, Line } from "react-native-svg"
import { apiFetch } from "@/lib/api"
import { useTheme } from "@/lib/theme"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface PlatformStats {
  itemCount:  number
  ownerCount: number
  categories: number
}

// ── Ícone de busca — transcrito de HeroSearch.tsx do site ────────────────────
function SearchIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8"/>
      <Path d="m21 21-4.35-4.35"/>
    </Svg>
  )
}

// ── Ícone CTA Ganhar — transcrito de app/page.tsx linha 184–196 ──────────────
function MoneyIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10"/>
      <Path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3"/>
    </Svg>
  )
}

// ── Ícone CTA Alugar — transcrito de app/page.tsx linha 205–218 ──────────────
function RentIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round">
      <Circle cx="11" cy="11" r="8"/>
      <Path d="m21 21-4.35-4.35"/>
    </Svg>
  )
}

// ── Tela Home (hero) ──────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { tokens } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")

  // Stats da plataforma — /api/stats se existir; sem inventar endpoint novo.
  // Conforme spec: se não houver dado, omite a faixa de stats.
  const { data: statsData } = useQuery<{ data: PlatformStats }>({
    queryKey: ["platform-stats"],
    queryFn: () => apiFetch<{ data: PlatformStats }>("/api/stats"),
    staleTime: 5 * 60_000,
    retry: false,   // não tentar múltiplas vezes se endpoint não existir
  })

  const stats = statsData?.data

  function handleSearch() {
    const q = searchQuery.trim()
    if (q) {
      router.push(`/explorar?q=${encodeURIComponent(q)}`)
    } else {
      router.push("/explorar")
    }
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: tokens.bg }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO — gradiente navy, transcrito de app/page.tsx linha 138–252 ── */}
      <View style={styles.hero}>
        {/* Orbe decorativo — "absolute -right-24 -top-24 ... bg-brand/15" */}
        <View style={styles.orb} />

        {/* H1 — "Ganhe dinheiro com o que está parado na sua casa." */}
        {/* Fonte: app/page.tsx linhas 150–154 — verbatim */}
        <Text style={styles.h1}>
          {"Ganhe dinheiro com o que\n"}
          <Text style={styles.h1Accent}>está parado na sua casa.</Text>
        </Text>

        {/* Subtítulo — "Tudo perto de você." — app/page.tsx linha 169 */}
        <Text style={styles.subtitle}>Tudo perto de você.</Text>

        {/* Dual CTA — transcritos de app/page.tsx linhas 179–221 */}
        <View style={styles.ctaGroup} accessibilityRole="none" accessibilityLabel="Ações principais">
          {/* CTA 1 — "Quero Ganhar Dinheiro" */}
          <TouchableOpacity
            onPress={() => router.push("/itens/novo")}
            style={styles.ctaPrimary}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Quero ganhar dinheiro anunciando meus itens"
          >
            <MoneyIcon />
            <Text style={styles.ctaText}>QUERO GANHAR DINHEIRO</Text>
          </TouchableOpacity>

          {/* CTA 2 — "Quero Alugar" */}
          <TouchableOpacity
            onPress={() => router.push("/explorar")}
            style={styles.ctaSecondary}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Quero alugar um item"
          >
            <RentIcon />
            <Text style={styles.ctaSecondaryText}>QUERO ALUGAR</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de busca — transcrita de HeroSearch.tsx do site */}
        {/* "O que você precisa alugar?" + botão "Buscar" */}
        <View style={styles.searchBar} accessibilityRole="search">
          <SearchIcon />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder="O que você precisa alugar?"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Buscar item para alugar ou anunciar"
          />
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.searchButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Buscar"
          >
            <Text style={styles.searchButtonText}>BUSCAR</Text>
          </TouchableOpacity>
        </View>

        {/* Stats — 4 números — transcritos de app/page.tsx linhas 232–249 */}
        {/* Exibe apenas se a API retornou dados (spec: omite se não houver dado) */}
        {stats && (
          <View style={styles.statsRow} accessibilityRole="list" accessibilityLabel="Números da plataforma">
            <StatItem num={stats.itemCount.toLocaleString("pt-BR")}  label="Itens disponíveis" />
            <StatItem num={stats.ownerCount.toLocaleString("pt-BR")} label="Proprietários ativos" />
            <StatItem num="0%"                                        label="Custo para anunciar" />
            <StatItem num={String(stats.categories)}                  label="Categorias" />
          </View>
        )}
      </View>

      {/* ── Seção pós-hero: convite para explorar ── */}
      <View style={[styles.section, { backgroundColor: tokens.surface }]}>
        <Text style={[styles.sectionTitle, { color: tokens.navy }]}>
          Explore o que está disponível
        </Text>
        <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
          Ferramentas, eletrônicos, esportes, moda e muito mais — perto de você.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/explorar")}
          style={styles.exploreBtn}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ver itens disponíveis"
        >
          <Text style={styles.exploreBtnText}>Ver anúncios disponíveis</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ── StatItem — transcrito de app/page.tsx linhas 243–248 ─────────────────────
function StatItem({ num, label }: { num: string; label: string }) {
  return (
    <View style={styles.statItem}>
      {/* "text-[22px] font-extrabold text-accent" — app/page.tsx linha 244 */}
      <Text style={styles.statNum}>{num}</Text>
      {/* "text-[12px] text-white/60" — app/page.tsx linha 247 */}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// ── Estilos — tokens transcritos de globals.css e app/page.tsx ────────────────
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    // "bg-gradient-to-br from-primary to-blue-medium" — app/page.tsx linha 139
    // RN não tem gradiente linear nativo — usamos bg-primary (#003366)
    backgroundColor: "#003366",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    overflow: "hidden",
    position: "relative",
  },
  orb: {
    // "absolute -right-24 -top-24 ... bg-brand/15" — app/page.tsx linha 144
    position:        "absolute",
    right:           -60,
    top:             -60,
    width:           200,
    height:          200,
    borderRadius:    100,
    backgroundColor: "rgba(0,123,60,0.15)",
  },
  h1: {
    // "font-display text-[24px] font-extrabold leading-[1.15] text-white" — app/page.tsx linha 150
    fontSize:    24,
    fontFamily:  "Montserrat_800ExtraBold",
    lineHeight:  28,
    color:       "#FFFFFF",
    textAlign:   "center",
    marginBottom: 4,
  },
  h1Accent: {
    // "text-accent" — accent = #59C686 — app/page.tsx linha 153
    // NOTA: #59C686 não é usado como cor de texto SOBRE fundo claro (contraste 2.07:1),
    // mas sobre fundo navy (#003366) o contraste é 4.57:1 — aprovado WCAG AA.
    color: "#59C686",
  },
  subtitle: {
    // "text-base font-medium text-white/80" — app/page.tsx linha 168
    fontSize:    16,
    fontWeight:  "500",
    color:       "rgba(255,255,255,0.80)",
    textAlign:   "center",
    marginBottom: 24,
    marginTop:   12,
  },
  ctaGroup: {
    gap:          12,
    marginBottom: 20,
  },
  ctaPrimary: {
    // "bg-brand px-6 py-3 ... text-sm font-semibold uppercase" — app/page.tsx linha 182
    backgroundColor:  "#007B3C",
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "center",
    gap:              8,
    borderRadius:     8,
    minHeight:        48,   // min-h-tap = 44px; usamos 48 para conforto
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize:    13,
    fontWeight:  "600",
    color:       "#FFFFFF",
    letterSpacing: 0.4,
  },
  ctaSecondary: {
    // "border-2 border-white/60 bg-transparent" — app/page.tsx linha 203
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "center",
    gap:              8,
    borderRadius:     8,
    borderWidth:      2,
    borderColor:      "rgba(255,255,255,0.60)",
    minHeight:        48,
    paddingHorizontal: 24,
  },
  ctaSecondaryText: {
    fontSize:    13,
    fontWeight:  "600",
    color:       "#FFFFFF",
    letterSpacing: 0.4,
  },
  searchBar: {
    // "rounded-xl bg-surface px-4 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    // HeroSearch.tsx do site
    flexDirection:    "row",
    alignItems:       "center",
    backgroundColor:  "#FFFFFF",
    borderRadius:     12,
    paddingHorizontal: 16,
    paddingVertical:   6,
    gap:              8,
    marginBottom:     28,
    // shadow
    shadowColor:   "#000000",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius:  10,
    elevation:     8,
  },
  searchInput: {
    // "flex-1 text-[15px] text-foreground" — HeroSearch.tsx
    flex:     1,
    fontSize: 15,
    color:    "#0F172A",
    minHeight: 44,
    padding: 0,
  },
  searchButton: {
    // "bg-brand px-3 py-2 text-sm font-semibold uppercase" — HeroSearch.tsx
    backgroundColor: "#007B3C",
    borderRadius:    8,
    paddingHorizontal: 12,
    paddingVertical:   8,
    minHeight:       36,
    alignItems:      "center",
    justifyContent:  "center",
  },
  searchButtonText: {
    fontSize:    12,
    fontWeight:  "700",
    color:       "#FFFFFF",
    letterSpacing: 0.4,
  },
  statsRow: {
    // "flex flex-wrap justify-center gap-5" — app/page.tsx linha 230
    flexDirection:  "row",
    flexWrap:       "wrap",
    justifyContent: "center",
    gap:            16,
  },
  statItem: {
    // "text-center text-white" — app/page.tsx linha 243
    alignItems: "center",
    minWidth:   72,
  },
  statNum: {
    // "text-[22px] font-extrabold leading-none text-accent" — app/page.tsx linha 244
    fontSize:   22,
    fontFamily: "Montserrat_800ExtraBold",
    lineHeight: 24,
    color:      "#59C686",   // text-accent — contraste OK sobre navy
  },
  statLabel: {
    // "text-[12px] text-white/60" — app/page.tsx linha 247
    fontSize:  12,
    color:     "rgba(255,255,255,0.60)",
    marginTop: 2,
    textAlign: "center",
  },
  section: {
    padding:      24,
    marginTop:    0,
  },
  sectionTitle: {
    fontSize:    20,
    fontFamily:  "Montserrat_700Bold",
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize:    14,
    lineHeight:  20,
    marginBottom: 16,
  },
  exploreBtn: {
    backgroundColor:  "#007B3C",
    borderRadius:     8,
    minHeight:        48,
    alignItems:       "center",
    justifyContent:   "center",
    paddingHorizontal: 24,
  },
  exploreBtnText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#FFFFFF",
  },
})
